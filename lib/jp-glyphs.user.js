// ==UserScript==
// @name         Prioritize Japanese glyphs on Japanese Websites
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.2
// @description  Prioritize Japanese for Han unification (Can be edited to prioritize other langs)
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @match        https://*.goo.ne.jp/*
// @match        https://*.weblio.jp/*
// @match        https://eow.alc.co.jp/*
// @match        https://www.kanjipedia.jp/*
// @match        http://yourei.jp/*
// @match        https://youglish.com/pronounce/*/japanese?
// @match        https://immersionkit.com/*
// @match        https://*.immersionkit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=eastasiastudent.net
// @grant        none
// ==/UserScript==

(() => {
  // src/jp-glyphs.ts
  var DEFAULT_LANG = "ja-JP";
  new MutationObserver((muts) => {
    for (const mut of muts) {
      mut.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) {
          injectLang(n);
        }
      });
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
  injectLang(document.body);
  function injectLang(el, lang = DEFAULT_LANG) {
    el.querySelectorAll(":not([lang])").forEach((it) => {
      let parent = it.parentElement;
      while (parent) {
        const lang0 = parent.getAttribute("lang");
        if (lang0 && lang0 !== lang && lang0 !== "en" && parent.tagName.toLocaleUpperCase() !== "HTML") {
          return;
        }
        parent = parent.parentElement;
      }
      it.setAttribute("lang", lang);
    });
  }
})();
