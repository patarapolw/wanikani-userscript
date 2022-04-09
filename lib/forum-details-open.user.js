// ==UserScript==
// @name         WaniKani Community Details Keep Open State
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Keep [details] or <details> tags as open or close, and not changing with edits
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?domain=wanikani.com
// @grant        none
// ==/UserScript==

(() => {
  // src/shared/discourse.ts
  function getWindow() {
    return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  }

  // src/forum-details-open.ts
  var elPreview = null;
  var openKeys = /* @__PURE__ */ new Map();
  var EDITOR_PREVIEW_CLASS = "d-editor-preview";
  var obs = new MutationObserver((muts) => {
    muts.forEach((m) => {
      for (const n of m.addedNodes) {
        if (n instanceof HTMLElement && n.classList.contains(EDITOR_PREVIEW_CLASS)) {
          elPreview = n;
          openKeys.clear();
        }
      }
      for (const n of m.removedNodes) {
        if (n instanceof HTMLElement && n.classList.contains(EDITOR_PREVIEW_CLASS)) {
          elPreview = null;
        }
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  function getDetailsKey(d) {
    var _a;
    return ((_a = d.querySelector("summary")) == null ? void 0 : _a.innerHTML) || d.getAttribute(":open") || "";
  }
  var markdownIt = getWindow().require("pretty-text/engines/discourse-markdown-it");
  var oldCook = markdownIt.cook;
  markdownIt.cook = function(raw, opts) {
    let html = oldCook.bind(this)(raw, opts);
    if (elPreview) {
      elPreview.querySelectorAll("details").forEach((details) => {
        const key = getDetailsKey(details);
        if (key) {
          openKeys.set(key, details.open);
        }
      });
      const div = document.createElement("div");
      div.innerHTML = html;
      div.querySelectorAll("details").forEach((details) => {
        if (details.hasAttribute("open"))
          return;
        const key = getDetailsKey(details);
        if (key) {
          const state = openKeys.get(key);
          if (typeof state === "boolean") {
            details.open = state;
          }
        }
      });
      html = div.innerHTML;
    }
    return html;
  };
})();
