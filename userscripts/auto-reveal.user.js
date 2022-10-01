// ==UserScript==
// @name         WaniKani Always Show Item Info
// @namespace    polv/wanikani
// @version      1.0
// @description  Always show WaniKani item info during reviews without scrolling, no matter if your answer was correct or not.
// @author       polv
// @match        *://www.wanikani.com/*/session*
// @grant        none
// ==/UserScript==

/// <reference types="jquery" />
(function () {
  'use strict';

  const onSubmit = () => {
    setTimeout(() => {
      const btn = document.getElementById('option-item-info');
      if (btn instanceof HTMLElement && !btn.classList.contains('active')) {
        btn.click();
        // const { scrollX, scrollY, scrollTo } = window.unsafeWindow || window;
        // const noScroll = () => scrollTo(scrollX, scrollY);
        // window.addEventListener('scroll', onscroll);
        // setTimeout(() => {
        //   btn.click();
        // }, 100);
        // setTimeout(() => {
        //   window.removeEventListener('scroll', noScroll);
        // }, 1000);
      }
    }, 50);
  };

  new MutationObserver(() => {
    const answerForm = document.querySelector('#answer-form fieldset');
    if (answerForm instanceof HTMLElement && answerForm.className) {
      onSubmit();
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
})();
