// ==UserScript==
// @name         WaniKani All Info Expander
// @namespace    http://www.wanikani.com
// @version      0.2
// @description  Automatically click "Show All Information"
// @author       polv
// @match        *://www.wanikani.com/*/session*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  let qType = '';
  let sType = '';

  const inputObserver = new MutationObserver((muts) => {
    // if (qType !== 'meaning') return;

    setTimeout(() => {
      for (const m of muts) {
        const { target } = m;
        if (
          target instanceof HTMLDivElement &&
          target.getAttribute('correct')
        ) {
          const btn = document.querySelector(
            '.additional-content__item--item-info',
          );
          if (btn && !btn.className.includes('--open')) {
            // @ts-ignore
            btn.click();
          }
          return;
        }
      }
    }, 100);
  });

  /** @type {Element | null} */
  let inputContainer = null;

  window.addEventListener('willShowNextQuestion', (e) => {
    qType = '';

    if ('detail' in e) {
      const { subject, questionType } = /** @type {any} */ (e.detail);
      qType = questionType;
      sType = subject.type;
    }

    const newInput = document.querySelector('.quiz-input__input-container');
    if (newInput && newInput !== inputContainer) {
      inputContainer = newInput;
      inputObserver.observe(inputContainer, {
        attributes: true,
        attributeFilter: ['correct'],
      });
    }
  });
})();
