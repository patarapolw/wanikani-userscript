declare const unsafeWindow: Window
declare const exportFunction: (...args: any[]) => any

declare global {
  interface Window {
    require(m: 'pretty-text/engines/discourse-markdown-it'): {
      cook(raw: string, opts: any): string
    }
    require(m: 'discourse/controllers/composer'): {
      default: {
        prototype: {
          save(t: unknown): void
        }
      }
    }
  }
}

export function getWindow() {
  return typeof unsafeWindow === 'undefined' ? window : unsafeWindow
}

export function getExportFunction() {
  return typeof exportFunction === 'undefined' ? (o: any) => o : exportFunction
}

let isCookedInjected = false

export function injectCook(fn: (raw: string) => string) {
  if (isCookedInjected) return false
  isCookedInjected = true
  const w = getWindow()
  const rq = w.require('pretty-text/engines/discourse-markdown-it')
  const { cook } = rq
  rq.cook = getExportFunction()(function (raw: string, opts: any) {
    return cook(fn(raw), opts)
  }, w)

  return true
}

let isSaveInjected = false

export function injectSave(fn: () => void) {
  if (isSaveInjected) return false
  isSaveInjected = true
  const w = getWindow()
  const rq = w.require('discourse/controllers/composer')
  const { save } = rq.default.prototype
  rq.default.prototype.save = getExportFunction()(function (t: unknown) {
    fn()
    // @ts-ignore
    save.bind(this)(t)
  })

  return true
}

export class DiscourseTextEdit {
  tText: HTMLTextAreaElement | null = null

  async setup(evt: {
    onCreate?: (el: HTMLTextAreaElement) => void
    onUpdate?: (ev: CompositionEvent) => void
    onCleanup?: () => void
    onChange?: (md: string) => string
    onSave: (md: string) => string
  }) {
    this.tText = document.querySelector('textarea.d-editor-input')

    let waitLimit = 30
    let obsTarget: HTMLElement | null = null
    while (
      (obsTarget = document.getElementById('reply-control')) &&
      waitLimit--
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (!obsTarget) return null

    const notifyOnChange = () => {
      if (!this.tText) return
      const onChange = evt.onChange || evt.onSave
      const v = onChange(this.tText.value)
      if (v === this.tText.value) return
      this.tText.value = v
      this.tText.dispatchEvent(
        new Event('change', { bubbles: true, cancelable: true })
      )
    }

    this.tText = await new Promise<HTMLTextAreaElement>((resolve) => {
      const obs = new MutationObserver((muts) => {
        muts.forEach((m) => {
          for (const n of m.addedNodes) {
            if (n instanceof HTMLTextAreaElement) {
              if (evt.onUpdate) {
                n.addEventListener('compositionupdate', evt.onUpdate)
              }
              n.addEventListener('compositionend', notifyOnChange)

              resolve(n)
              obs.disconnect()
            }
          }
          for (const n of m.removedNodes) {
            if (
              evt.onCleanup &&
              n instanceof HTMLElement &&
              n.classList.contains('reply-area')
            ) {
              evt.onCleanup()
              this.setup(evt)
            }
          }
        })
      })

      obs.observe(obsTarget!, { childList: true, subtree: true })
    })

    injectCook(evt.onSave)
    injectSave(notifyOnChange)

    return this.tText
  }
}
