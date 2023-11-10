// ==UserScript==
// @name         WK SRS stage in Review
// @namespace    wanikani
// @version      0.1.0
// @description  SRS Stage in Review
// @author       polv
// @match        *://www.wanikani.com/*
// @match        *://preview.wanikani.com/*
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CLASS_NAME = 'wk-srs-in-review';
  let subject = null;

  /* requires wkof */

  const wkItemLink = {};
  Object.assign(window, { wkItemLink });

  wkof.include('ItemData');
  wkof
    .ready('ItemData')
    .then(() =>
      wkof.ItemData.get_items({ wk_items: { options: { assignments: true } } }),
    )
    .then((rs) => {
      wkItemLink.itemData = [];
      rs.map((c) => {
        wkItemLink.itemData[c.id] = c;
      });
      addQuizStats();
    });

  addEventListener('willShowNextQuestion', (ev) => {
    subject = ev.detail.subject;
    addQuizStats();
  });

  function addQuizStats() {
    document.querySelectorAll(`.${CLASS_NAME}`).forEach((el) => el.remove());
    if (!subject || !wkItemLink.itemData) return;

    const target = document.querySelector('.quiz-statistics');
    if (!target) return;

    const srs_stage = document.createElement('div');
    srs_stage.className = `${CLASS_NAME} quiz-statistics__item srs_stage`;

    const inner = document.createElement('div');

    let i = wkItemLink.itemData[subject.id].assignments.srs_stage;
    const labels = [
      '0',
      ...Array(4)
        .fill('A')
        .map((a, i) => a + (i + 1)),
      ...Array(2)
        .fill('G')
        .map((a, i) => a + (i + 1)),
      'M',
      'E',
    ];
    const label = labels[i];

    let color = 'gray';

    switch (label[0]) {
      case 'A':
        color = '#dd0093';
        break;
      case 'G':
        color = '#882d9e';
        break;
      case 'M':
        color = '#294ddb';
        break;
      case 'E':
        color = '#0093dd';
        break;
    }

    inner.style.color = color;
    inner.style.wordBreak = 'keep-all';
    inner.innerText = label;
    srs_stage.append(inner);
    target.prepend(srs_stage);
  }

  (function addCSS() {
    const style = document.createElement('style');
    style.append(
      document.createTextNode(/* css */ `
    .${CLASS_NAME}.srs_stage {
      background-color: white;
      border-radius: 50%;
      width: 1.5em;
      height: 1.5em;
      align-items: center;
      justify-content: center;
    }
    `),
    );
    document.head.append(style);
  })();
})();
