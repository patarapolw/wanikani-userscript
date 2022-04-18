// ==UserScript==
// @name         Lang attribute setter (prioritize Kanji font on Japanese Websites)
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.5
// @description  Fixes Han unification, for example for Japanese (can be edited to prioritize other langs)
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @match        https://*.goo.ne.jp/*
// @match        https://*.weblio.jp/*
// @match        https://eow.alc.co.jp/*
// @match        https://www.kanjipedia.jp/*
// @match        http://yourei.jp/*
// @match        https://yourei.jp/*
// @match        https://youglish.com/*
// @match        https://immersionkit.com/*
// @match        https://*.immersionkit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=eastasiastudent.net
// @grant        none
// ==/UserScript==

(() => {
  // src/shared/inject-lang.ts
  function injectLangObserver(lang, el = document.body) {
    new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            injectLang(n, lang);
          }
        });
      }
    }).observe(el, {
      childList: true,
      subtree: true
    });
    injectLang(el, lang);
  }
  function injectLang(el, lang) {
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

  // src/jp-glyphs.ts
  var DEFAULT_LANG = "ja-JP";
  var isInject = true;
  if (typeof location !== "undefined" && /[\./]youglish\.com$/.test(location.origin)) {
    isInject = /japanese/.test(location.pathname);
    if (!isInject) {
      DEFAULT_LANG = "ko-KR";
      isInject = /korean/.test(location.pathname);
    }
    if (!isInject) {
      const m = /chinese(\/([a-z]{2}))?\?$/.exec(location.pathname);
      if (m) {
        DEFAULT_LANG = `zh-${(m[1] || "CN").toLocaleUpperCase()}`;
        isInject = true;
      }
    }
    if (!isInject) {
      DEFAULT_LANG = "zh-CN";
      isInject = /chinese/.test(location.pathname);
    }
  }
  if (isInject) {
    injectLangObserver(DEFAULT_LANG);
  }
})();
