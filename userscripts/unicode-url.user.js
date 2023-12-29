// ==UserScript==
// @name         WaniKani Community Unicode URI
// @namespace    polv/wanikani-community
// @version      0.1
// @description  Fix URL encode
// @author       polv
// @match        *://community.wanikani.com/*
// @require      https://unpkg.com/uri-js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=community.wanikani.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  document.addEventListener('click', async () => {
    const text = await navigator.clipboard.readText();
    if (text) {
      await navigator.clipboard.writeText(
        text.replace(/(%[0-9A-F]{2})+/gi, (r) => {
          return URI.normalize(r, { iri: true });
          // return decodeURIComponent(r);
        }),
      );
    }
  });
})();
