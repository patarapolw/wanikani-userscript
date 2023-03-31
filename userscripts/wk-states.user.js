// ==UserScript==
// @name         Wanikani States History
// @namespace    polv/wanikani
// @version      0.1
// @description  Wanikani States History, with hyperlink to itemPage and dummy lesson
// @author       polv
// @match        https://www.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1166918
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
    summary.style.cursor = 'pointer';
    summary.innerText = `${properName || o.characters} (${o.type} ${
      currentInfo?.questionType || o.on
    })`;

    currentEl.append(
      summary,
      (() => {
        const p = document.createElement('p');
        p.append(
          (() => {
            const a = document.createElement('a');
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
            a.href = `https://www.wanikani.com/subjects/lesson/quiz?queue=${o.id}`;
            a.rel = 'noreferer';
            a.target = '_blank';
            a.innerText = 'Lesson';
            return a;
          })(),
        );

        return p;
      })(),
      (() => {
        const pre = document.createElement('pre');
        pre.style.fontFamily = 'monospace';
        pre.style.margin = '0 2em';
        pre.textContent = JSON.stringify(currentInfo || o, null, 2);

        return pre;
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
          details.append(summary, ...queue);

          return details;
        })(),
      );
    }

    queue.push(currentEl);
    return div;
  });
})();
