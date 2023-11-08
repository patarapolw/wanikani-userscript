// ==UserScript==
// @name         Wanikani States History
// @namespace    polv/wanikani
// @version      0.1.4
// @description  Wanikani States History, with hyperlink to itemPage and dummy lesson
// @author       polv
// @match        https://www.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1276693
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const queue = [];
  let currentInfo = null;

  window.addEventListener('willShowNextQuestion', (e) => {
    if (e.detail) {
      currentInfo = e.detail;
    }
  });

  let lastState = null;
  let questionType = '';

  wkItemInfo.append('WK States History', (o) => {
    if (o.on === 'itemPage') {
      currentInfo = null;
    }

    const div = document.createElement('div');

    let properName = '';
    if (o.type === 'radical') {
      properName = o.meaning[0].replace(/ /g, '-').toLocaleLowerCase();
    }

    const currentEl = document.createElement('details');
    const summary = document.createElement('summary');
    summary.lang = 'ja';
    summary.style.cursor = 'pointer';
    summary.innerHTML = `${
      properName
        ? `${
            o.characters && typeof o.characters === 'object'
              ? `<img src="${o.characters.url}" alt="${o.characters.meaning}" style="filter: invert(1)" width=16 height=16>`
              : o.characters || ''
          } ${properName}`
        : o.characters
    } (${o.type} ${currentInfo?.questionType || o.on})`;

    currentEl.append(
      summary,
      (() => {
        const p = document.createElement('p');
        p.append(
          (() => {
            const a = document.createElement('a');
            a.lang = 'ja';
            a.href = properName
              ? `https://www.wanikani.com/radicals/${properName}`
              : `https://www.wanikani.com/${o.type}/${o.characters}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = decodeURIComponent(a.href);
            return a;
          })(),
          document.createTextNode('・'),
          (() => {
            const a = document.createElement('a');
            a.href = `https://www.wanikani.com/subjects/${o.id}/lesson?queue=${o.id}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = 'Lesson';
            return a;
          })(),
          document.createTextNode('・'),
          (() => {
            const a = document.createElement('a');
            a.href = `https://www.wanikani.com/subjects/lesson/quiz?queue=${o.id}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = 'Lesson Quiz';
            return a;
          })(),
          document.createTextNode('・'),
          (() => {
            const a = document.createElement('a');
            a.href = `https://www.wanikani.com/subjects/review?queue=${o.id}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = 'Review';
            return a;
          })(),
          document.createTextNode('・'),
          (() => {
            const a = document.createElement('a');
            a.href = `https://www.wanikani.com/subjects/extra_study?Reorder%20Omega&queue_type=recent_lessons&queue=${o.id}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = 'Extra Study';
            return a;
          })(),
        );

        return p;
      })(),
      (() => {
        const block = document.createElement('blockquote');
        block.lang = 'ja';
        block.style.margin = '0 2em';
        block.append(
          ...JSON.stringify(currentInfo || o, null, '　　')
            .split('\n')
            .map((s) =>
              Object.assign(document.createElement('p'), { textContent: s }),
            ),
        );

        return block;
      })(),
    );
    div.append(currentEl);

    if (queue.length) {
      div.append(
        document.createElement('br'),
        (() => {
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.style.cursor = 'pointer';
          summary.innerText = 'History';

          const block = document.createElement('ol');
          block.style.paddingLeft = '1em';
          block.style.listStyle = 'decimal';
          block.append(
            ...queue.map((it) => {
              const li = document.createElement('li');
              li.style.paddingLeft = '0.5em';
              li.append(it);
              return li;
            }),
          );

          block.querySelectorAll('details').forEach((el) => {
            el.open = false;
          });

          details.append(summary, block);

          return details;
        })(),
      );
    }

    if (
      !lastState ||
      lastState.on !== o.on ||
      lastState.id !== o.id ||
      questionType !== currentInfo?.questionType
    ) {
      queue.unshift(currentEl);
    }

    lastState = o;
    questionType = currentInfo?.questionType;

    return div;
  });
})();
