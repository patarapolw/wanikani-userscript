import { w } from './shared/discourse';

const SHIRITORI_IDS = ['16404'];
const WARN_ENDING_N = '<b>You lost.</b> Shiritori is lost with ん.';

function doCleanPostCook(p: IPost) {
  let readStartsAt = 0;

  // Current Shiritori First Post specific
  const is16404op = p.post_number === 1 && p.topic_id === 16404;
  if (!readStartsAt) {
    if (is16404op) {
      readStartsAt =
        p.cooked
          .split('\n')
          .findIndex((ln) => ln.includes('continue where we left off')) + 1;
    }
  }

  if (readStartsAt) {
    return p.cooked.split('\n').slice(readStartsAt).join('\n');
  }

  return p.cooked;
}

let topicId = '';

function isShiritoriId(tid: string) {
  return SHIRITORI_IDS.includes(String(tid));
}

const vocabMap = new Map<
  string,
  {
    [id: string]: IPostMatched;
  }
>();

const SEL_EDITOR_INPUT = 'textarea.d-editor-input';
const SEL_POPUP = '.composer-popup';

let elEditorInput: HTMLElement | null;

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
          elEditorInput = n.querySelector(SEL_EDITOR_INPUT);
          if (elEditorInput && (!vocabMap.size || topicId !== oldTopicId)) {
            fetchAllAndAddToJa().then(() => {
              w.console.info('Vocab list loaded');
            });
          }
        }

        const SEL = 'article[data-post-id]';
        const postEls = [...n.querySelectorAll(SEL)];
        if (n.matches(SEL)) {
          postEls.push(n);
        }

        postEls.map((tp) => {
          if (tp instanceof HTMLElement) {
            const id = Number(tp.getAttribute('data-post-id'));
            const username = tp.querySelector('a[data-user-card]')?.textContent;
            const topic_id = Number(topicId);
            const post_number = Number(tp.id.split('_', 2)[1]);
            const cooked = tp.querySelector('.cooked')?.innerHTML;

            if (id && username && topic_id && post_number && cooked) {
              const p: IPost = {
                id,
                username,
                topic_id,
                post_number,
                cooked,
              };

              doCleanPostCook(p)
                .split('\n')
                .map((ln) => {
                  findAndAddJa(ln, p);
                });
            }
          }
        });
      }
    }
    for (const n of m.removedNodes) {
      if (n instanceof HTMLElement && n.querySelector(SEL_EDITOR_INPUT)) {
        elEditorInput = null;
      }
    }
  });
});

obs.observe(document.body, { childList: true, subtree: true });

const markdownIt = w.require('pretty-text/engines/discourse-markdown-it');
const oldCook = markdownIt.cook;

markdownIt.cook = function (raw: string, opts: any) {
  let html = oldCook.bind(this)(raw, opts);

  if (!elEditorInput) {
    return html;
  }

  let editPostNumber = 0;
  let elReplyControl = elEditorInput.parentElement;
  while (elReplyControl && !elReplyControl.matches('#reply-control')) {
    elReplyControl = elReplyControl.parentElement;
  }

  if (elReplyControl) {
    const elEditing = elReplyControl.querySelector('a.post-link');
    if (elEditing && elEditing instanceof HTMLAnchorElement) {
      editPostNumber = Number(elEditing.href.split('/').pop());
    }
  }

  let matched: {
    vocab: string;
    line: string[];
    post: IPost;
  }[] = [];
  let isN = false;

  html = html
    .split('\n')
    .map((ln) => {
      const ps = findJaPost(ln);
      if (editPostNumber) {
        ps.posts = ps.posts.filter(
          (p) => p.post.post_number !== editPostNumber,
        );
      }

      let isWrong = false;

      if (ps.posts.length) {
        matched.push(...ps.posts);
        isWrong = true;
      }

      if (WARN_ENDING_N && ps.vocabs.some((v) => v.endsWith('ん'))) {
        isN = true;
        isWrong = true;
      }

      if (isWrong) {
        return ln
          .replace(/(<p>|^)/, '$1<del>')
          .replace(/(<\/p>|$)/, '</del>$1');
      }

      return ln;
    })
    .join('\n');

  if (isN || matched.length) {
    html += '\n<hr/>\n';
  }

  if (isN) {
    const container = document.createElement('p');
    container.innerHTML = WARN_ENDING_N;
    html += container.outerHTML;
  }

  if (matched.length) {
    html += [
      ...distinctBy(matched, (p) => p.post.post_number)
        .sort(cmp((p) => -p.post.post_number))
        .map((p) => {
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

    setTimeout(() => {
      document.querySelectorAll(SEL_POPUP).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
        }
      });
    });
  }

  return html;
};

// *********************************
// Function declarations
// *********************************

interface IPost {
  id: number;
  username: string;
  topic_id: number;
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

  w.console.error(r);
  return null;
}

export async function fetchAllAndAddToJa() {
  const m = reTopic.exec(location.href);
  if (!m) return;

  const urlBase = location.origin + '/t/' + m[1];
  const r0 = await jsonFetch<ITopicResponse>(
    urlBase + (m[2] ? '/' + m[2] : '') + '.json',
  );
  if (!r0) return;

  const posts: IPost[] = [];
  const addAllPosts = (ps: IPost[]) => {
    ps.map((p) => {
      doCleanPostCook(p)
        .split('\n')
        .map((ln) => {
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
    await Promise.all(
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
    w.console.error(
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

export function distinctBy<T, V = any>(arr: T[], fn: (t: T) => V) {
  const u = new Set<V>();
  return arr.filter((a) => {
    const v = fn(a);
    if (u.has(v)) return false;
    u.add(v);
    return true;
  });
}
