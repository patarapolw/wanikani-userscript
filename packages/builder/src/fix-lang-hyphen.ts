const FIX_LANG_HYPHEN: Record<string, string> = {
  ja: '',
  ko: '',
  zh: '',
  vi: ''
}

getLang(document.documentElement)
fixLangObserver()

export function fixLangObserver(el = document.body) {
  new MutationObserver((muts) => {
    for (const mut of muts) {
      mut.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) {
          findAndFixLang(n)
        }
      })
    }
  }).observe(el, {
    childList: true,
    subtree: true
  })

  findAndFixLang(el)
}

export function findAndFixLang(el: HTMLElement) {
  el.querySelectorAll('*').forEach((it) => getLang(it))
}

export function getLang(it: Element, fix = true) {
  let aLang = it.getAttribute('lang')
  if (aLang && typeof FIX_LANG_HYPHEN[aLang] === 'string') {
    aLang += '-' + FIX_LANG_HYPHEN[aLang]
    if (fix) {
      it.setAttribute('lang', aLang)
    }
    return aLang
  }
  return null
}
