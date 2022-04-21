import { getWindow, logger } from './shared/discourse'

interface IPost {
  id: string
  username: string
  cooked: string
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

let elPreview: HTMLElement | undefined
let vocabList: ITopicResponse | undefined

const EDITOR_PREVIEW_CLASS = 'd-editor-preview'

const obs = new MutationObserver((muts) => {
  muts.forEach((m) => {
    for (const n of m.addedNodes) {
      if (
        n instanceof HTMLElement &&
        n.classList.contains(EDITOR_PREVIEW_CLASS)
      ) {
        elPreview = n
        const urlBase = location.href.replace(
          /\/t\/[^/]+\/(\d+)(\/.*)?$/,
          '/t/$1'
        )
        fetch(urlBase + '.json').then((r) => {
          if (r.ok) {
            r.json().then((r: ITopicResponse) => {
              vocabList = r
              const stream = vocabList?.post_stream?.stream || []
              if (stream.length)
                fetch(urlBase + '/posts.json', {
                  body: JSON.stringify({
                    post_ids: stream
                  })
                }).then((r) => {
                  if (r.ok) {
                    r.json().then((r: ITopicPostResponse) => {
                      if (vocabList) {
                        vocabList.post_stream.posts.push(...r.post_stream.posts)
                        logger('log', vocabList)
                      }
                    })
                  }
                })
            })
          }
        })
      }
    }
    for (const n of m.removedNodes) {
      if (
        n instanceof HTMLElement &&
        n.classList.contains(EDITOR_PREVIEW_CLASS)
      ) {
        vocabList = undefined
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
  console.log(elPreview)
  return html
}
