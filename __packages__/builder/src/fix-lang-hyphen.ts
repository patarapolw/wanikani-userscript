const FIX_LANG_HYPHEN: Record<string, string> = {
  ja: 'JP',
  ko: 'KR',
  zh: '',
  vi: ''
}

if (
  document.documentElement.lang &&
  FIX_LANG_HYPHEN[document.documentElement.lang]
) {
  document.documentElement.lang +=
    '-' + FIX_LANG_HYPHEN[document.documentElement.lang]
}

fixLangObserver()

export function fixLangObserver(el = document.body) {
  new MutationObserver((muts) => {
    for (const mut of muts) {
      mut.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) {
          fixLang(n)
        }
      })
    }
  }).observe(el, {
    childList: true,
    subtree: true
  })

  fixLang(el)
}

export function fixLang(el: HTMLElement) {
  const fixLang = (it: Element) => {
    let aLang = it.getAttribute('lang')
    if (aLang && FIX_LANG_HYPHEN[aLang]) {
      return aLang + '-' + FIX_LANG_HYPHEN[aLang]
    }
    return null
  }

  el.querySelectorAll('*').forEach((it) => {
    let newLang = fixLang(it)

    let parent = it.parentElement
    while (!newLang && parent) {
      const aLang = parent.getAttribute('lang')
      if (
        aLang &&
        aLang !== 'en' &&
        parent.tagName.toLocaleUpperCase() !== 'HTML'
      ) {
        return
      }
      newLang = fixLang(parent)
      parent = parent.parentElement
    }

    if (newLang) {
      it.setAttribute('lang', newLang)
    }
  })
}
