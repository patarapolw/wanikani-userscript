export function injectLangObserver(lang: string, el = document.body) {
  new MutationObserver((muts) => {
    for (const mut of muts) {
      mut.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) {
          injectLang(n, lang)
        }
      })
    }
  }).observe(el, {
    childList: true,
    subtree: true
  })

  injectLang(el, lang)
}

export function injectLang(el: HTMLElement, lang: string) {
  el.querySelectorAll(':not([lang])').forEach((it) => {
    let parent = it.parentElement
    while (parent) {
      const lang0 = parent.getAttribute('lang')
      if (
        lang0 &&
        lang0 !== lang &&
        lang0 !== 'en' &&
        parent.tagName.toLocaleUpperCase() !== 'HTML'
      ) {
        return
      }
      parent = parent.parentElement
    }

    it.setAttribute('lang', lang)
  })
}
