// ==UserScript==
// @name         WaniKani No Scroll
// @namespace    http://www.wanikani.com
// @version      0.1.3
// @description  Don't scroll on "Show Information"
// @author       polv
// @match        https://www.wanikani.com/extra_study/session*
// @match        https://www.wanikani.com/review/session*
// @match        https://www.wanikani.com/subjects/*
// @match        https://preview.wanikani.com/extra_study/session*
// @match        https://preview.wanikani.com/review/session*
// @match        https://preview.wanikani.com/subjects*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @homepage     https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/no-scroll.user.js
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  const el = {
    quiz: /** @type {HTMLElement | null} */ (null),
    addtionalContent: /** @type {HTMLElement | null} */ (null),
  };

  const noScroll = ({ target }) => {
    target.scrollTop = 0;
  };

  const contentLoadedObserver = new MutationObserver((muts) => {
    const { quiz } = el;
    if (!quiz) return;

    for (const mut of muts) {
      const { target } = mut;
      if (
        target instanceof HTMLElement &&
        target.getAttribute('data-loaded') === 'true'
      ) {
        quiz.addEventListener('scroll', noScroll);
        setTimeout(() => {
          quiz.removeEventListener('scroll', noScroll);
        }, 500);
        break;
      }
    }
  });

  let intervalFindElement = 0;

  const startScript = () => {
    stopScript();

    intervalFindElement = setInterval(() => {
      el.addtionalContent = document.querySelector('turbo-frame#subject-info');
      if (!el.addtionalContent) return;

      el.quiz = document.querySelector('.quiz');
      if (!el.quiz) return;

      contentLoadedObserver.observe(el.addtionalContent, {
        attributes: true,
        attributeFilter: ['data-loaded'],
      });
      stopScript();
    }, 500);
  };

  const stopScript = () => {
    if (intervalFindElement) {
      clearInterval(intervalFindElement);
      intervalFindElement = 0;
    }
  };

  startScript();

  window.addEventListener('turbo:load', (e) => {
    // @ts-ignore
    const url = e.detail.url;
    if (!url) return;
    if (/(session|quiz|review|extra_study)/.test(url)) {
      startScript();
    } else {
      stopScript();
    }
  });
})();
