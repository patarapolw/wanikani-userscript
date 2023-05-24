// ==UserScript==
// @name         WaniKani Review Button always clickable
// @namespace    http://wanikani.com
// @version      0.1
// @description   Sorry! You have no items to review right now, or maybe you do.
// @author       polv
// @match        https://www.wanikani.com/dashboard
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const btn = document.querySelector(
    'span.lessons-and-reviews__reviews-button',
  );
  if (btn) {
    const clickable = document.createElement('a');
    clickable.href = '/subjects/review';

    clickable.className = btn.className;
    clickable.title = btn.title;
    clickable.append(...btn.childNodes);

    btn.replaceWith(clickable);
  }
})();
