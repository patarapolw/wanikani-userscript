import { getWindow } from './shared/discourse'

let elPreview: HTMLElement | null = null
const openKeys = new Map()

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
  return d.querySelector('summary')?.innerHTML || d.getAttribute(':open') || ''
}

export const markdownIt = getWindow().require(
  'pretty-text/engines/discourse-markdown-it'
)
const oldCook = markdownIt.cook

markdownIt.cook = function (raw: string, opts: any) {
  let html = oldCook.bind(this)(raw, opts)

  if (elPreview) {
    elPreview.querySelectorAll('details').forEach((details) => {
      const key = getDetailsKey(details)
      if (key) {
        openKeys.set(key, details.open)
      }
    })

    const div = document.createElement('div')
    div.innerHTML = html
    div.querySelectorAll('details').forEach((details) => {
      if (details.hasAttribute('open')) return

      const key = getDetailsKey(details)
      if (key && openKeys.has(key)) {
        details.open = openKeys.get(key)
      }
    })
    html = div.innerHTML
  }
  return html
}
