// ==UserScript==
// @name         WaniKani Community prioritize Japanese glyphs
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.2
// @description  Prioritization of Japanese glyphs for Han unification
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'
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
})()

function injectLang(el, lang = 'ja-JP') {
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
