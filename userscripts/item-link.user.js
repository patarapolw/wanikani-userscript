// ==UserScript==
// @name         WK Item Link
// @namespace    wanikani
// @version      0.1.0
// @description  Item info page link and external links
// @author       polv
// @match        *://www.wanikani.com/*
// @match        *://preview.wanikani.com/*
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CLASS_NAME = 'wk-item-link';

  addEventListener('willShowNextQuestion', (ev) => {
    document.querySelectorAll(`.${CLASS_NAME}`).forEach((el) => el.remove());

    if (!ev.detail.subject.characters) return;

    const target = document.querySelector('.character-header__menu-statistics');

    const container = document.createElement('div');
    container.className = CLASS_NAME;

    const a = document.createElement('a');
    container.append(a);
    a.target = '_blank';
    a.href = `https://www.wanikani.com/${ev.detail.subject.subject_category.toLocaleLowerCase()}/${encodeURIComponent(
      ev.detail.subject.characters,
    )}`;
    a.innerText = 'Item Page';

    const addLink = ({ label, link }) => {
      container.append(document.createTextNode('・'));

      const a = document.createElement('a');
      container.append(a);
      a.target = '_blank';
      a.href = link;
      a.innerText = label;
    };

    addLink({
      label: 'Jotoba',
      link: `https://jotoba.de/search/0/${encodeURIComponent(
        ev.detail.subject.characters,
      )}`,
    });
    addLink({
      label: 'jpdb',
      link: `https://jpdb.io/search?q=${encodeURIComponent(
        ev.detail.subject.characters,
      )}`,
    });
    addLink({
      label: 'Weblio',
      link: `https://www.weblio.jp/content/${encodeURIComponent(
        ev.detail.subject.characters,
      )}`,
    });

    if (ev.detail.subject.subject_category !== 'Vocabulary') {
      addLink({
        label: 'Kanjipedia',
        link: `https://www.kanjipedia.jp/search/?k=${encodeURIComponent(
          ev.detail.subject.characters,
        )}&kt=1&wt=1&sk=leftHand&t=kanji`,
      });
    }

    target.append(container);
  });

  (function addCSS() {
    const style = document.createElement('style');
    style.append(
      document.createTextNode(/* css */ `
    .character-header__menu {
      align-items: flex-start;
    }

    .character-header__menu-statistics {
      flex-direction: column;
      flex-basis: max-content;
      align-items: flex-end;
    }

    .${CLASS_NAME} a {
      color: unset;
      text-decoration: none;
    }
    `),
    );
    document.head.append(style);
  })();
})();
