new MutationObserver((muts) => {
  for (const mut of muts) {
    mut.addedNodes.forEach((n) => {
      if (n instanceof HTMLElement) {
        injectLang(n)
      }
    })
  }
}).observe(document.body, {
  childList: true,
  subtree: true
})

injectLang(document.body)

function injectLang(el: HTMLElement, lang = 'ja-JP') {
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
