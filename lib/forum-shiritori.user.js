// ==UserScript==
// @name         WaniKani Community Shiritori Duplicate Checker
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Check if the vocabulary you are replying with is a duplicate
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/t/shiritori/16404/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=community.wanikani.com
// @grant        none
// ==/UserScript==

(() => {
  // src/shared/discourse.ts
  function getWindow() {
    return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  }

  // src/forum-shiritori.ts
  var elPreview;
  var vocabList;
  var EDITOR_PREVIEW_CLASS = "d-editor-preview";
  var obs = new MutationObserver((muts) => {
    muts.forEach((m) => {
      for (const n of m.addedNodes) {
        if (n instanceof HTMLElement && n.classList.contains(EDITOR_PREVIEW_CLASS)) {
          elPreview = n;
          fetch(location.href.replace(/\/t\/[^/]+\/(\d+)(\/.*)?$/, "/t/$1.json")).then((r) => {
            if (r.ok) {
              r.json().then((r2) => {
                vocabList = r2;
                getWindow().console.log(vocabList);
              });
            }
          });
        }
      }
      for (const n of m.removedNodes) {
        if (n instanceof HTMLElement && n.classList.contains(EDITOR_PREVIEW_CLASS)) {
          vocabList = void 0;
        }
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  var markdownIt = getWindow().require("pretty-text/engines/discourse-markdown-it");
  var oldCook = markdownIt.cook;
  markdownIt.cook = function(raw, opts) {
    let html = oldCook.bind(this)(raw, opts);
    return html;
  };
})();
