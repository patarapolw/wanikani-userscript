import { getWindow, logger } from './shared/discourse'

let elPreview: HTMLElement | null
let elPreviewThrottle: NodeJS.Timeout | null = null

const vocabMap = new Map<
  string,
  {
    [id: string]: IPostMatched
  }
>()

const EDITOR_PREVIEW_CLASS = 'd-editor-preview'

const reJaWithRuby = (() => {
  const ja = '[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}]+'
  return new RegExp(
    `(${ja}|<ruby\\b[^>]*>(<rt>.*?</rt>)?${ja}.*?</ruby>)+`,
    'gu'
  )
})()
const reTopic = /\/t\/[^/]+\/(\d+)(\/.*)?$/

const obs = new MutationObserver((muts) => {
  const m = reTopic.exec(location.href)
  if (!m || !['16404'].includes(m[1])) {
    elPreview = null
    return
  }

  muts.forEach((m) => {
    for (const n of m.addedNodes) {
      if (n instanceof HTMLElement) {
        if (!elPreview) {
          elPreview = n.querySelector(`.${EDITOR_PREVIEW_CLASS}`)
          if (elPreview) {
            fetchAll(location.href.replace(reTopic, '/t/$1')).then((posts) => {
              posts.map((p) => {
                p.cooked.split('\n').map((ln) => {
                  findAndAddJa(ln, p)
                })
              })
            })
          }
        }
      }
    }
    for (const n of m.removedNodes) {
      if (
        n instanceof HTMLElement &&
        n.querySelector(`.${EDITOR_PREVIEW_CLASS}`)
      ) {
        elPreview = null
        vocabMap.clear()
      }
    }
  })
})

obs.observe(document.body, { childList: true, subtree: true })

export const markdownIt = getWindow().require(
  'pretty-text/engines/discourse-markdown-it'
)
const oldCook = markdownIt.cook

markdownIt.cook = function (raw: string, opts: any) {
  let html = oldCook.bind(this)(raw, opts)

  const matched: {
    vocab: string
    line: string
    post: IPost
  }[] = []

  html = html
    .split('\n')
    .map((ln) => {
      const ps = findJaPost(ln)

      if (ps.length) {
        matched.push(...ps)
        return ln.replace(/(<p>|^)/, '$1<del>').replace(/(<\/p>|$)/, '</del>$1')
      }
      return ln
    })
    .join('\n')

  if (matched.length) {
    html += [
      '\n<hr/>\n',
      ...matched.sort(cmp((p) => p.post.post_number)).map((p) => {
        const a = document.createElement('a')
        a.className = 'mention'
        a.href = '/u/' + p.post.username
        a.innerText = '@' + p.post.username

        return a.outerHTML + ' ' + p.line
      })
    ].join('\n')
  }

  return html
}

// *********************************
// Function declarations
// *********************************

interface IPost {
  id: number
  username: string
  post_number: number
  cooked: string
}

interface IPostMatched extends IPost {
  _lines: {
    [vocab: string]: string
  }
}

interface ITopicPostResponse {
  post_stream: {
    posts: IPost[]
  }
}

interface ITopicResponse {
  actions_summary: {}[]
  archetype: string
  fancy_title: string
  title: string
  post_stream: {
    posts: IPost[]
    stream: number[]
  }
  posts_count: number
  reply_count: number
}

export async function jsonFetch<T>(
  url: string,
  params?: Record<string, string>
): Promise<T | null> {
  if (params) {
    const u = new URL(url)
    Object.entries(params).map(([k, v]) => {
      u.searchParams.set(k, v)
    })
  }

  const r = await fetch(url)
  if (r.ok) {
    return r.json()
  }

  return null
}

export async function fetchAll(urlBase: string) {
  const vocabList = await jsonFetch<ITopicResponse>(urlBase + '.json')
  if (!vocabList) return []

  const stream = vocabList.post_stream.stream || []
  const chunks: number[][] = []
  while (stream.length) {
    chunks.push(stream.splice(0, 300))
  }

  const posts: IPost[] = []
  while (chunks.length) {
    const rs = await Promise.all(
      chunks.splice(0, 10).map((ids) =>
        jsonFetch<ITopicPostResponse>(urlBase + '/posts.json', {
          'post_ids[]': ids.join(',')
        })
      )
    ).then((rs) => rs.map((r) => (r ? r.post_stream.posts : [])))

    rs.map((r) => {
      posts.push(...r)
    })

    if (chunks.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  posts.push(...vocabList.post_stream.posts)

  return posts
}

export function makeKanji(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('ruby').forEach((el) => {
    el.querySelectorAll('rt, rp').forEach((r) => r.remove())
    el.replaceWith(el.innerText)
  })
  return div.innerHTML
}

export function makeReading(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('ruby').forEach((el) => {
    const rt = el.querySelector('rt')
    if (rt) {
      el.replaceWith(rt)
    }
  })
  return div.innerHTML
}

export function findJa(ln: string) {
  const lines: {
    v: string
    line: string
  }[] = []
  for (const m of ln.matchAll(reJaWithRuby)) {
    const line =
      m.index !== undefined
        ? ln.substring(0, m.index) +
          `<ins>` +
          m[0] +
          `</ins>` +
          ln.substring(m.index + m[0].length)
        : ln

    if (m[0].includes('</ruby>')) {
      lines.push({ v: makeKanji(m[0]), line }, { v: makeReading(m[0]), line })
    } else {
      lines.push({ v: m[0], line })
    }
  }
  return lines
}

export function findAndAddJa(ln: string, p: IPost) {
  for (const { v, line } of findJa(ln)) {
    const prev = vocabMap.get(v) || {}
    const _lines = prev[p.id]?._lines || {}
    _lines[v] = line
    prev[p.id] = { ...p, _lines }
    vocabMap.set(v, prev)
  }
}

export function findJaPost(ln: string) {
  const out: {
    vocab: string
    line: string
    post: IPost
  }[] = []

  findJa(ln).map(({ v }) => {
    const ps = vocabMap.get(v)
    if (ps) {
      Object.values(ps).map((post) => {
        const line = post._lines[v]
        if (line) {
          out.push({ vocab: v, line, post })
        }
      })
    }
  })

  return out
}

export function cmp<T>(cb: (t: T) => number) {
  return (t1: T, t2: T) => cb(t1) - cb(t2)
}
