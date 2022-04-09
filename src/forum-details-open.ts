import { getWindow } from './shared/discourse'

let elPreview: HTMLElement | null = null
const openKeys = new Map<string, boolean>()

const EDITOR_PREVIEW_CLASS = 'd-editor-preview'

const obs = new MutationObserver((muts) => {
  muts.forEach((m) => {
    for (const n of m.addedNodes) {
      if (
        n instanceof HTMLElement &&
        n.classList.contains(EDITOR_PREVIEW_CLASS)
      ) {
        elPreview = n
        openKeys.clear()
      }
    }
    for (const n of m.removedNodes) {
      if (
        n instanceof HTMLElement &&
        n.classList.contains(EDITOR_PREVIEW_CLASS)
      ) {
        elPreview = null
      }
    }
  })
})

obs.observe(document.body, { childList: true, subtree: true })

function getDetailsKey(d: HTMLDetailsElement): string {
  return d.querySelector('summary')?.innerHTML || ''
}

export const markdownIt = getWindow().require(
  'pretty-text/engines/discourse-markdown-it'
)
const oldCook = markdownIt.cook

markdownIt.cook = function (raw: string, opts: any) {
  let html = oldCook.bind(this)(raw, opts)

  if (elPreview) {
    const keys = new Map<string, number>()
    const makeKey = (key: string) => {
      const k0 = key
      let i = keys.get(k0) || 0
      if (!i) {
        key = JSON.stringify([key, ++i])
      } else {
        key = JSON.stringify(key)
      }
      keys.set(k0, i)
      return key
    }

    elPreview.querySelectorAll('details').forEach((details) => {
      let key = getDetailsKey(details)

      if (key) {
        openKeys.set(makeKey(key), details.open)
      }
    })

    keys.clear()

    const div = document.createElement('div')
    div.innerHTML = html
    div.querySelectorAll('details').forEach((details) => {
      let key = getDetailsKey(details)
      if (key) {
        key = makeKey(key)

        if (details.hasAttribute('open')) return

        const state = openKeys.get(key)
        if (typeof state === 'boolean') {
          details.open = state
        }
      }
    })
    html = div.innerHTML
  }
  return html
}
