// ==UserScript==
// @name         Add lang hyphen, if not exists for HTML tags
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Arch Linux Firefox doesn't set lang="ja" as Japanese
// @author       polv
// @license      MIT
// @match        https://*.wiktionary.org/*
// @match        https://*.wikipedia.org/*
// @match        https://community.wanikani.com/*
// @match        https://*.goo.ne.jp/*
// @match        https://*.weblio.jp/*
// @match        https://*.alc.co.jp/*
// @match        https://*.kanjipedia.jp/*
// @match        *://yourei.jp/*
// @match        https://*.jitenon.jp/*
// @match        https://moji.tekkai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=eastasiastudent.net
// @grant        none
// ==/UserScript==

(() => {
  // src/fix-lang-hyphen.ts
  var FIX_LANG_HYPHEN = {
    ja: "JP"
  };
  if (document.documentElement.lang && FIX_LANG_HYPHEN[document.documentElement.lang]) {
    document.documentElement.lang += "-" + FIX_LANG_HYPHEN[document.documentElement.lang];
  }
  fixLangObserver();
  function fixLangObserver(el = document.body) {
    new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            fixLang(n);
          }
        });
      }
    }).observe(el, {
      childList: true,
      subtree: true
    });
    fixLang(el);
  }
  function fixLang(el) {
    const fixLang2 = (it) => {
      let aLang = it.getAttribute("lang");
      if (aLang && FIX_LANG_HYPHEN[aLang]) {
        return aLang + "-" + FIX_LANG_HYPHEN[aLang];
      }
      return null;
    };
    el.querySelectorAll("*").forEach((it) => {
      let newLang = fixLang2(it);
      let parent = it.parentElement;
      while (!newLang && parent) {
        const aLang = parent.getAttribute("lang");
        if (aLang && aLang !== "en" && parent.tagName.toLocaleUpperCase() !== "HTML") {
          return;
        }
        newLang = fixLang2(parent);
        parent = parent.parentElement;
      }
      if (newLang) {
        it.setAttribute("lang", newLang);
      }
    });
  }
})();
