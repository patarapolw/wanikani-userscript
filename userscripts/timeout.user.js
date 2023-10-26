// ==UserScript==
// @name         WaniKani Time's Up
// @namespace    http://www.wanikani.com
// @version      0.1.1
// @description  Tell when you have taken too long for a question
// @author       polv
// @match        https://www.wanikani.com/extra_study/session*
// @match        https://www.wanikani.com/review/session*
// @match        https://www.wanikani.com/subjects/*
// @match        https://preview.wanikani.com/extra_study/session*
// @match        https://preview.wanikani.com/review/session*
// @match        https://preview.wanikani.com/subjects/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @homepage     https://greasyfork.org/en/scripts/478277-wanikani-time-s-up
// @supportURL   https://community.wanikani.com/t/what-do-you-want-now-request-extensions-here/3838/1710
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  const TIMEUP_SECONDS = 5;

  let currentSubject = null;
  let currentAnswer = '';

  /** @type {HTMLInputElement | null} */
  let inputContainer = null;

  addEventListener('willShowNextQuestion', (e) => {
    // @ts-ignore
    const { detail } = e;

    currentSubject = detail.subject;

    if (!inputContainer) {
      inputContainer = document.querySelector('input[name="user-response"]');
      if (inputContainer) {
        const el = inputContainer;
        el.addEventListener('keydown', (ev) => {
          if (!currentAnswer) return;
          if (ev.key === 'Escape' || ev.code === 'Escape') {
            el.value = currentAnswer;
          }
        });
      }
    }

    if (inputContainer) {
      const el = inputContainer;
      setTimeout(() => {
        if (detail.subject === currentSubject) {
          currentAnswer = el.value;

          // https://community.wanikani.com/t/userscript-i-dont-know-button/7231
          el.value =
            detail.questionType === 'reading'
              ? 'えぇぇーさっぱりわからないぃぃぃ'
              : 'Aargh! What does that even mean? (╯°□°)╯︵ ┻━┻';
        }
      }, 1000 * TIMEUP_SECONDS);
    }
  });

  addEventListener('didAnswerQuestion', () => {
    currentSubject = null;
  });
})();
