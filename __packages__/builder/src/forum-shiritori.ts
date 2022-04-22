import { getWindow, logger } from './shared/discourse';

let elEditorInput: HTMLElement | null;
let topicId = '';

function isShiritoriId(tid: string) {
  return ['16404'].includes(String(tid));
}

const vocabMap = new Map<
  string,
  {
    [id: string]: IPostMatched;
  }
>();

const EDITOR_INPUT_SELECTOR = 'textarea.d-editor-input';

const reJaStr = '[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}ー]+';
const reJaWithRuby = new RegExp(
  `(${reJaStr}|<ruby\\b[^>]*>(<rt>.*?</rt>)?${reJaStr}.*?</ruby>)+`,
  'gu',
);
const reNotJa = new RegExp(`(?!${reJaStr})`, 'gu');
const reTopic = /\/t\/[^/]+\/(\d+)(?:\/(\d+).*)?$/;

const obs = new MutationObserver((muts) => {
  let oldTopicId = '';
  const newTopicId = getTopicId();
  if (!newTopicId) {
    return;
  }

  if (topicId !== newTopicId) {
    vocabMap.clear();
    oldTopicId = topicId;
    topicId = newTopicId;
  }

  muts.forEach((m) => {
    for (const n of m.addedNodes) {
      if (n instanceof HTMLElement) {
        if (!elEditorInput && topicId) {
          elEditorInput = n.querySelector(EDITOR_INPUT_SELECTOR);
          if (elEditorInput && (!vocabMap.size || topicId !== oldTopicId)) {
            fetchAllAndAddToJa().then(() => {
              logger('info', 'Vocab list loaded');
            });
          }
        }
      }
    }
    for (const n of m.removedNodes) {
      if (n instanceof HTMLElement && n.querySelector(EDITOR_INPUT_SELECTOR)) {
        elEditorInput = null;
      }
    }
  });
});

obs.observe(document.body, { childList: true, subtree: true });

export const markdownIt = getWindow().require(
  'pretty-text/engines/discourse-markdown-it',
);
const oldCook = markdownIt.cook;

markdownIt.cook = function (raw: string, opts: any) {
  let html = oldCook.bind(this)(raw, opts);

  const matched: {
    vocab: string;
    line: string[];
    post: IPost;
  }[] = [];

  html = html
    .split('\n')
    .map((ln) => {
      const ps = findJaPost(ln);

      if (ps.posts.length) {
        matched.push(...ps.posts);
        return ln
          .replace(/(<p>|^)/, '$1<del>')
          .replace(/(<\/p>|$)/, '</del>$1');
      } else if (ps.vocabs.some((v) => v.endsWith('ん'))) {
        return ln
          .replace(/(<p>|^)/, '$1<del>')
          .replace(/(<\/p>|$)/, '</del>$1');
      }

      return ln;
    })
    .join('\n');

  if (matched.length) {
    html += [
      '\n<hr/>\n',
      ...matched.sort(cmp((p) => -p.post.post_number)).map((p) => {
        const container = document.createElement('p');
        container.append(
          Object.assign(document.createElement('a'), {
            href: '/t/x/' + topicId + '/' + p.post.post_number,
            innerText: '#' + p.post.post_number,
          }),
          ' ',
          Object.assign(document.createElement('a'), {
            className: 'mention',
            href: '/u/' + p.post.username,
            innerText: '@' + p.post.username,
          }),
        );
        container.innerHTML +=
          ' ' +
          p.line
            .map((s, i) => (i % 2 ? '<ins>' + s + '</ins>' : s))
            .join('')
            .replace(/^<p>/, '')
            .replace(/<\/p>$/, '');
        return container.outerHTML;
      }),
    ].join('\n');
  }

  return html;
};

// *********************************
// Function declarations
// *********************************

interface IPost {
  id: number;
  username: string;
  post_number: number;
  cooked: string;
}

interface IPostMatched extends IPost {
  _lines: {
    [vocab: string]: string[];
  };
}

interface ITopicResponse {
  actions_summary: {}[];
  archetype: string;
  fancy_title: string;
  title: string;
  post_stream: {
    posts: IPost[];
    stream: number[];
  };
  posts_count: number;
  reply_count: number;
}

interface ITopicPostResponse {
  post_stream: {
    posts: IPost[];
  };
}

export async function jsonFetch<T>(url: string): Promise<T | null> {
  const r = await fetch(url);
  if (r.ok) {
    const json = await r.json();
    if (!json.errors) {
      return json;
    }
  }

  logger('error', r);
  return null;
}

export async function fetchAllAndAddToJa() {
  const m = reTopic.exec(location.href);
  if (!m) return;

  const urlBase = location.origin + '/t/' + m[1];
  const r0 = await jsonFetch<ITopicResponse>(urlBase + '/' + m[2] + '.json');
  if (!r0) return;

  const posts: IPost[] = [];
  const addAllPosts = (ps: IPost[]) => {
    ps.map((p) => {
      p.cooked.split('\n').map((ln) => {
        findAndAddJa(ln, p);
      });
    });
    posts.push(...ps);
  };

  addAllPosts(r0.post_stream.posts);

  const stream = r0.post_stream.stream || [];
  const chunks: number[][] = [];
  while (stream.length) {
    chunks.push(stream.splice(0, 300));
  }

  let isContinue = true;
  while (chunks.length && isContinue) {
    const rs = await Promise.all(
      chunks
        .splice(0, 10)
        .map((ids) =>
          jsonFetch<ITopicPostResponse>(
            urlBase +
              '/posts.json?' +
              ids.map((id) => `post_ids[]=${id}`).join('&'),
          ),
        ),
    ).then((rs) =>
      rs.map((r) => {
        if (!r) {
          isContinue = false;
          return;
        }

        addAllPosts(r.post_stream.posts);
      }),
    );

    // if (chunks.length) {
    //   await new Promise((r) => setTimeout(r, 1000));
    // }
  }

  if (!isContinue) {
    logger(
      'error',
      `Total posts: ${r0.posts_count} != real count: ${posts.length}, due to Rate Limit?`,
    );
  }
}

export function makeKanji(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('ruby').forEach((el) => {
    el.querySelectorAll('rt, rp').forEach((r) => r.remove());
    el.replaceWith(el.innerText);
  });
  return div.innerHTML;
}

export function makeReading(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('ruby').forEach((el) => {
    const rt = el.querySelector('rt');
    if (rt) {
      el.replaceWith(rt.innerText.replace(reNotJa, ''));
    }
  });
  return div.innerHTML;
}

export function normalizeKana(s: string) {
  return s.replace(/\p{sc=Katakana}/gu, (p) => {
    const cp = p.codePointAt(0);
    if (cp) {
      return String.fromCodePoint(cp - 96);
    }
    return p;
  });
}

export function findJa(ln: string) {
  const lines: {
    v: string;
    line: string[];
  }[] = [];
  for (const m of ln.matchAll(reJaWithRuby)) {
    const line =
      m.index !== undefined
        ? [ln.substring(0, m.index), m[0], ln.substring(m.index + m[0].length)]
        : [ln];

    if (m[0].includes('</ruby>')) {
      lines.push(
        { v: normalizeKana(makeKanji(m[0])), line },
        { v: normalizeKana(makeReading(m[0])), line },
      );
    } else {
      lines.push({ v: normalizeKana(m[0]), line });
    }
  }
  return lines;
}

export function findAndAddJa(ln: string, p: IPost) {
  for (const { v, line } of findJa(ln)) {
    const prev = vocabMap.get(v) || {};
    const _lines = prev[p.id]?._lines || {};
    _lines[v] = line;
    prev[p.id] = { ...p, _lines };
    vocabMap.set(v, prev);
  }
}

export function findJaPost(ln: string) {
  const out: {
    line: string;
    posts: {
      vocab: string;
      line: string[];
      post: IPost;
    }[];
    vocabs: string[];
  } = {
    line: ln,
    posts: [],
    vocabs: [],
  };

  out.vocabs = findJa(ln).map(({ v }) => {
    const ps = vocabMap.get(v);
    if (ps) {
      Object.values(ps).map((post) => {
        const line = post._lines[v];
        if (line) {
          out.posts.push({ vocab: v, line, post });
        }
      });
    }
    return v;
  });

  return out;
}

export function getTopicId() {
  const m = reTopic.exec(location.href);
  if (m && isShiritoriId(m[1])) {
    return m[1];
  }
  return '';
}

export function cmp<T>(cb: (t: T) => number) {
  return (t1: T, t2: T) => cb(t1) - cb(t2);
}
