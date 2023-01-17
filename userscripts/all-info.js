// ==UserScript==
// @name         WaniKani All Info Expander
// @namespace    http://www.wanikani.com
// @version      0.1
// @description  Automatically click "Show All Information"
// @author       polv
// @match        *://www.wanikani.com/*/session*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
(function () {
  'use strict';

  $.jStorage.listenKeyChange('questionCount', () => {
    setTimeout(() => {
      /** @type {HTMLDivElement | null} */
      const elShowInfo = document.querySelector('#all-info');
      if (elShowInfo) {
        elShowInfo.click();
      }
    }, 1000);
  });
})();
