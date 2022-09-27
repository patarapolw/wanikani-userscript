// ==UserScript==
// @name         Lang attribute setter (prioritize Kanji font on Japanese Websites)
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.9
// @description  Fixes Han unification, for example, for Japanese (can be edited to prioritize other langs)
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @match        https://*.kanjipedia.jp/*
// @match        https://moji.tekkai.com/*
// @match        https://youglish.com/*
// @match        https://*.immersionkit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=eastasiastudent.net
// @grant        none
// ==/UserScript==

(() => {
  // src/shared/inject-lang.ts
  function injectLangHTML(lang2) {
    const obs = new MutationObserver(() => {
      if (document.documentElement.lang !== lang2) {
        document.documentElement.lang = lang2;
      }
    });
    obs.observe(document.documentElement, { attributeFilter: ["lang"] });
    document.documentElement.lang = lang2;
  }

  // src/jp-glyphs.ts
  var lang = "ja-JP";
  var isInject = true;
  if (typeof location !== "undefined" && /[\./]youglish\.com$/.test(location.origin)) {
    lang = "ja-JP";
    isInject = /japanese/.test(location.pathname);
    if (!isInject) {
      lang = "ko-KR";
      isInject = /korean/.test(location.pathname);
    }
    if (!isInject) {
      const m = /chinese(\/([a-z]{2}))?\?$/.exec(location.pathname);
      if (m) {
        lang = `zh-${(m[1] || "CN").toLocaleUpperCase()}`;
        isInject = true;
      }
    }
    if (!isInject) {
      lang = "zh-CN";
      isInject = /chinese/.test(location.pathname);
    }
  }
  if (isInject) {
    injectLangHTML(lang);
  }
})();
