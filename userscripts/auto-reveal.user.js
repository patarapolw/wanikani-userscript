// ==UserScript==
// @name         WaniKani Always Show Item Info
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Always show WaniKani item info during reviews without scrolling, no matter if your answer was correct or not.
// @author       irrelephant
// @match        *://www.wanikani.com/*/session*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  $.jStorage.listenKeyChange('questionCount', function (key, action) {
    const c = $.jStorage.get('currentItem');
    const q = $.jStorage.get('questionType');
    if (c.voc && q === 'reading') return;
    showItemInfo();
  });

  function noscroll() {
    window.scrollTo(0, 0);
  }

  // expand item info
  function showItemInfo() {
    window.addEventListener('scroll', noscroll);

    // expand item info
    setTimeout(function () {
      $('#option-item-info').click();
    }, 100);

    // Remove listener to disable scroll
    setTimeout(function () {
      window.removeEventListener('scroll', noscroll);
    }, 1000);
  }
})();
