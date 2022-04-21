import { getWindow, logger } from './shared/discourse'

let elPreview: HTMLElement | null
let topicId = ''

function isShiritoriId(tid: string) {
  return ['16404'].includes(String(tid))
}

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
  if (!m || !isShiritoriId(m[1])) {
    elPreview = null
    return
  }
  topicId = m[1]

  muts.forEach((m) => {
    for (const n of m.addedNodes) {
      if (n instanceof HTMLElement) {
        if (!elPreview && topicId) {
          elPreview = n.querySelector(`.${EDITOR_PREVIEW_CLASS}`)
          if (elPreview) {
            fetchAll(location.origin + '/t/' + topicId).then((posts) => {
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
        const container = document.createElement('p')
        container.append(
          Object.assign(document.createElement('a'), {
            href: '/t/' + topicId + '/' + p.post.post_number,
            innerText: '#' + p.post.post_number
          }),
          ' ',
          Object.assign(document.createElement('a'), {
            className: 'mention',
            href: '/u/' + p.post.username,
            innerText: '@' + p.post.username
          })
        )
        container.innerHTML += ' ' + p.line
        return container.outerHTML
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

export async function jsonFetch<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  if (r.ok) {
    return r.json()
  }

  logger('error', r)
  return null
}

export async function fetchAll(urlBase: string) {
  const r0 = await jsonFetch<ITopicResponse>(urlBase + '.json?print=true')
  if (!r0) return []

  const posts: IPost[] = r0.post_stream.posts
  let page = 2
  while (posts.length < r0.posts_count) {
    const r = await jsonFetch<ITopicResponse>(
      urlBase + '.json?print=true&page=' + page++
    )
    if (!r || !r.post_stream.posts.length) {
      break
    }
    posts.push(...r.post_stream.posts)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

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
    let line =
      m.index !== undefined
        ? ln.substring(0, m.index) +
          `<ins>` +
          m[0] +
          `</ins>` +
          ln.substring(m.index + m[0].length)
        : ln

    line = line
      .trim()
      .replace(/^<p>/, '')
      .replace(/<\/p>$/, '')

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
