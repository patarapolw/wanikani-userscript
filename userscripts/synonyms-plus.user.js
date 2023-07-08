// ==UserScript==
// @name         WaniKani User Synonyms++
// @namespace    http://www.wanikani.com
// @version      0.2.0
// @description  Better and Not-only User Synonyms
// @author       polv
// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @require      https://greasyfork.org/scripts/470201-wanikani-answer-checker/code/WaniKani%20Answer%20Checker.js?version=1215595
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @homepage     https://greasyfork.org/en/scripts/470180-wanikani-user-synonyms
// @supportURL   https://community.wanikani.com/t/userscript-user-synonyms/62481
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/synonyms-plus.user.js
// @grant        none
// ==/UserScript==

// @ts-check
/// <reference path="./types/answer-checker.d.ts" />
(function () {
  'use strict';

  const entryClazz = 'synonyms-plus';

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // @ts-ignore
  const _Dexie = /** @type {typeof import('dexie').default} */ (Dexie);
  /**
   * @typedef {{
   *   id: string;
   *   kunyomi?: string[];
   *   onyomi?: string[];
   *   nanori?: string[];
   *   aux: { questionType: string; text: string; type: AuxiliaryType; message: string }[];
   * }} EntrySynonym
   */

  class Database extends _Dexie {
    /** @type {import('dexie').Table<EntrySynonym, string>} */
    synonym;

    constructor() {
      super(entryClazz);
      this.version(1).stores({
        synonym: 'id',
      });
    }
  }

  const db = new Database();

  //////////////////////////////////////////////////////////////////////////////

  /** @type {EvaluationParam | null} */
  let answerCheckerParam = null;

  const wkSynonyms = {
    add: {
      kunyomi(r, type = /** @type {AuxiliaryType} */ ('whitelist')) {
        return this.reading(r, type, 'kunyomi');
      },
      onyomi(r, type = /** @type {AuxiliaryType} */ ('whitelist')) {
        return this.reading(r, type, 'onyomi');
      },
      nanori(r, type = /** @type {AuxiliaryType} */ ('whitelist')) {
        return this.reading(r, type, 'nanori');
      },
      reading(
        r,
        type = /** @type {AuxiliaryType} */ ('whitelist'),
        kanjiReading,
      ) {
        if (!wkSynonyms.entry.id) return;
        if (!r) return;

        r = toHiragana(r).trim();
        if (!/^\p{sc=Hiragana}+$/u.test(r)) return;

        wkSynonyms.remove._reading(r, type, kanjiReading);

        if (type === 'whitelist') {
          if (['kunyomi', 'onyomi', 'nanori'].includes(kanjiReading)) {
            wkSynonyms.entry[kanjiReading] = [
              ...(wkSynonyms.entry[kanjiReading] || []),
              r,
            ];
          }
          wkSynonyms.entry.aux.push({
            questionType: 'reading',
            text: r,
            type,
            message: '',
          });
        } else {
          wkSynonyms.entry.aux.push({
            questionType: 'reading',
            text: r,
            type,
            message: 'Not the reading YOU are looking for',
          });
        }

        db.synonym.put(wkSynonyms.entry, wkSynonyms.entry.id);
        return 'added';
      },
    },
    remove: {
      kunyomi(r) {
        return this.reading(r, null, 'kunyomi');
      },
      onyomi(r) {
        return this.reading(r, null, 'onyomi');
      },
      nanori(r) {
        return this.reading(r, null, 'nanori');
      },
      reading(r, _type, kanjiReading) {
        const op = this._reading(r, _type, kanjiReading);
        if (op === 'not removed') {
          wkSynonyms.add.reading(r, 'blacklist', kanjiReading);
          return 'blacklist';
        }
        return op;
      },
      _reading(r, _type, kanjiReading) {
        if (!wkSynonyms.entry.id) return;
        if (!r) return;

        r = toHiragana(r).trim();
        if (!/^\p{sc=Hiragana}+$/u.test(r)) return;

        const newAux = wkSynonyms.entry.aux.filter(
          (a) => a.questionType === 'reading' && a.text !== r,
        );

        if (['kunyomi', 'onyomi', 'nanori'].includes(kanjiReading)) {
          if (wkSynonyms.entry[kanjiReading]) {
            const newArr = wkSynonyms.entry[kanjiReading].filter(
              (a) => a !== r,
            );
            if (newArr.length < wkSynonyms.entry[kanjiReading].length) {
              wkSynonyms.entry[kanjiReading] = newArr;
              wkSynonyms.entry.aux = newAux;
              db.synonym.put(wkSynonyms.entry, wkSynonyms.entry.id);
              return 'removed';
            }
          }
        } else {
          if (newAux.length < wkSynonyms.entry.aux.length) {
            wkSynonyms.entry.aux = newAux;
            db.synonym.put(wkSynonyms.entry, wkSynonyms.entry.id);
            return 'removed';
          }
        }

        return 'not removed';
      },
    },
    entry: /** @type {EntrySynonym} */ ({
      id: '',
      aux: [],
    }),
  };
  Object.assign(window, { wkSynonyms });

  let isFirstRender = false;

  window.modAnswerChecker.register((e, tryCheck) => {
    answerCheckerParam = e;
    e = JSON.parse(JSON.stringify(e));

    e.item.readings = e.item.readings || [];
    e.item.auxiliary_readings = e.item.auxiliary_readings || [];

    let aux = wkSynonyms.entry.aux;

    for (const kanjiReading of /** @type {('kunyomi' | 'onyomi' | 'nanori')[]} */ ([
      'kunyomi',
      'onyomi',
      'nanori',
    ])) {
      const rs = wkSynonyms.entry[kanjiReading];
      if (rs) {
        e.item[kanjiReading] = [...(e.item[kanjiReading] || []), ...rs];
        e.item.auxiliary_readings = e.item.auxiliary_readings.filter(
          (a) => !rs.includes(a.reading),
        );
        aux = aux.filter((a) => !rs.includes(a.text));
      }
    }

    for (const { questionType, ...it } of aux) {
      if (questionType === 'reading') {
        e.item.readings = e.item.readings.filter((a) => a !== it.text);
        e.item.auxiliary_readings = e.item.auxiliary_readings.filter(
          (a) => a.reading !== it.text,
        );
        e.item.auxiliary_readings.push({ ...it, reading: it.text });
      } else {
        const text = normalize(it.text);

        e.item.meanings = e.item.meanings.filter((a) => normalize(a) !== text);
        e.item.auxiliary_meanings = e.item.auxiliary_meanings.filter(
          (a) => normalize(a.meaning) !== text,
        );
        e.userSynonyms = e.userSynonyms.filter((s) => normalize(s) !== text);
        e.item.auxiliary_meanings.push({ ...it, meaning: it.text });
      }
    }

    return tryCheck(e);
  });

  addEventListener('willShowNextQuestion', (ev) => {
    answerCheckerParam = null;
    wkSynonyms.entry.id = String(/** @type {any} */ (ev).detail.subject.id);
    wkSynonyms.entry.aux = [];
    isFirstRender = true;

    db.synonym.get(wkSynonyms.entry.id).then((it) => {
      if (it) {
        wkSynonyms.entry = it;
      }
    });
  });

  addEventListener('turbo:load', (ev) => {
    // @ts-ignore
    const url = ev.detail.url;
    if (!url) return;

    if (/wanikani\.com\/(radicals?|kanji|vocabulary)/.test(url)) {
      answerCheckerParam = null;
    }
  });

  const updateListing = () => {
    const frame = document.querySelector(
      'turbo-frame.user-synonyms',
    )?.parentElement;
    if (!frame?.parentElement) return;

    let divList = frame.parentElement.querySelector(`.${entryClazz}`);
    if (!divList) {
      divList = document.createElement('div');
      divList.className = entryClazz;
      frame.insertAdjacentElement('beforebegin', divList);
    }

    divList.textContent = '';

    const listing = {};

    wkSynonyms.entry.aux.map((it) => {
      const t = capitalize(it.type);
      listing[t] = listing[t] || [];
      listing[t].push(it.text);
    });

    for (const [k, vs] of Object.entries(listing)) {
      const div = document.createElement('div');
      div.className = 'subject-section__meanings';
      divList.append(div);

      const h = document.createElement('h2');
      h.className = 'subject-section__meanings-title';
      h.innerText = k;
      div.append(h);

      const ul = document.createElement('ul');
      ul.className = 'user-synonyms__items';
      div.append(ul);

      for (const v of vs) {
        const li = document.createElement('li');
        li.className = 'user-synonyms_item';
        ul.append(li);

        const span = document.createElement('span');
        span.className = 'user-synonym';
        span.innerText = v;
        li.append(span);
      }
    }
  };

  let updateAux = () => {};
  addEventListener('didUpdateUserSynonyms', (ev) => {
    updateAux();
  });

  addEventListener('turbo:frame-render', (ev) => {
    // @ts-ignore
    const { fetchResponse } = ev.detail;

    if (/wanikani\.com\/subject_info\/(\d+)/.test(fetchResponse.response.url)) {
      updateListing();
      return;
    }

    const [, subject_id] =
      /wanikani\.com\/user_synonyms.*\?.*subject_id=(\d+)/.exec(
        fetchResponse.response.url,
      ) || [];

    if (!subject_id) return;

    db.synonym.get(subject_id).then((it) => {
      if (it) {
        wkSynonyms.entry = it;
        updateAux();
      }
    });

    updateAux = () => {
      updateListing();

      const elContainer = document.querySelector(
        '.user-synonyms__form_container',
      );
      if (!elContainer) return;

      const elForm = elContainer.querySelector('form.user-synonyms__form');
      if (!(elForm instanceof HTMLFormElement)) return;

      const elInput = elContainer.querySelector('input[type="text"]');
      if (!(elInput instanceof HTMLInputElement)) return;

      if (isFirstRender && answerCheckerParam?.questionType === 'meaning') {
        elInput.value = answerCheckerParam?.response || '';
      }

      elInput.autocomplete = 'off';
      elInput.onkeydown = (ev) => {
        if (ev.key === 'Escape' || ev.code === 'Escape') {
          if (elInput.value) {
            elInput.value = '';
          } else {
            return;
          }
        }

        ev.stopImmediatePropagation();
        ev.stopPropagation();
      };

      elForm.onsubmit = (ev) => {
        isFirstRender = false;

        if (elInput.value.length < 2) return;
        const signs = ['-', '*', '?'];

        let sign = '';
        let str = '';
        for (sign of signs) {
          if (elInput.value.startsWith(sign)) {
            str = elInput.value.substring(sign.length);
            break;
          }
          if (elInput.value.endsWith(sign)) {
            str = elInput.value.substring(
              0,
              elInput.value.length - sign.length,
            );
            break;
          }
        }

        if (!str) return;

        const questionType = 'meaning';

        /** @type {AuxiliaryType | null} */
        let type = null;

        if (['-', '*'].includes(sign)) {
          type = 'blacklist';
        } else if (['?'].includes(sign)) {
          type = 'warn';
        }

        if (type) {
          ev.preventDefault();
          setTimeout(() => {
            updateAux();
            elInput.value = '';
          });

          if (
            !wkSynonyms.entry.aux.find(
              (a) =>
                a.questionType === questionType &&
                a.type === type &&
                a.text === str,
            )
          ) {
            wkSynonyms.entry.aux.push({
              questionType,
              text: str,
              type,
              message: 'Not the meaning YOU are looking for',
            });
            db.synonym.put(wkSynonyms.entry, subject_id);
          }
        }
      };

      let elExtraContainer = elContainer.querySelector(`.${entryClazz}`);
      if (!elExtraContainer) {
        elExtraContainer = document.createElement('div');
        elExtraContainer.className = entryClazz;
        elContainer.append(elExtraContainer);
      }
      elExtraContainer.textContent = '';

      for (const a of wkSynonyms.entry.aux) {
        let elAux = elExtraContainer.querySelector(
          `[data-${entryClazz}="${a.type}"]`,
        );
        if (!elAux) {
          elAux = document.createElement('div');
          elAux.className = 'user-synonyms__synonym-buttons';
          elAux.setAttribute(`data-${entryClazz}`, a.type);

          const h = document.createElement('h2');
          h.className =
            'wk-title wk-title--medium wk-title--underlined wk-title-custom';
          h.innerText = capitalize(a.type);

          elExtraContainer.append(h);
          elExtraContainer.append(elAux);
        }

        const btn = document.createElement('a');
        elAux.append(btn);
        btn.className = 'user-synonyms__synonym-button';

        btn.addEventListener('click', () => {
          wkSynonyms.entry.aux = wkSynonyms.entry.aux.filter(
            (a0) => a0.text !== a.text,
          );
          db.synonym.put(wkSynonyms.entry, subject_id);
          updateAux();
        });

        const icon = document.createElement('i');
        btn.append(icon);
        icon.className = 'wk-icon fa-regular fa-times';

        const span = document.createElement('span');
        btn.append(span);
        span.className = 'user-synonym__button-text';
        span.innerText = a.text;
      }

      if (!answerCheckerParam) return;

      const { item } = answerCheckerParam;
      const aux = item.auxiliary_meanings;

      if (aux.length) {
        elExtraContainer.append(
          (() => {
            const elDetails = document.createElement('details');

            const title = document.createElement('summary');
            elDetails.append(title);
            title.innerText = `Auxiliary meanings`;

            const elButtonSet = document.createElement('div');
            elDetails.append(elButtonSet);
            elButtonSet.className = 'user-synonyms__synonym-buttons';

            for (const a of aux) {
              let elAux = elDetails.querySelector(
                `[data-${entryClazz}="wk-${a.type}"]`,
              );
              if (!elAux) {
                elAux = document.createElement('div');
                elAux.className = 'user-synonyms__synonym-buttons';
                elAux.setAttribute(`data-${entryClazz}`, `wk-${a.type}`);

                const h = document.createElement('h2');
                h.className =
                  'wk-title wk-title--medium wk-title--underlined wk-title-custom';
                h.innerText = capitalize(a.type);

                elDetails.append(h);
                elDetails.append(elAux);
              }

              const span = document.createElement('span');
              elAux.append(span);
              span.className = 'user-synonym__button-text';
              span.innerText = a.meaning;
            }
            return elDetails;
          })(),
        );
      }
    };

    updateAux();
  });

  /** @param {string} s */
  function capitalize(s) {
    return s.replace(
      /[a-z]+/gi,
      (p) => p[0].toLocaleUpperCase() + p.substring(1),
    );
  }

  /** @param {string} s */
  function normalize(s) {
    return s.toLocaleLowerCase().replace(/\W/g, ' ').trim();
  }

  const CP_KATA_A = 'ア'.charCodeAt(0);
  const CP_HIRA_A = 'あ'.charCodeAt(0);

  /** @param {string} s */
  function toHiragana(s) {
    return s.replace(/\p{sc=Katakana}/gu, (c) =>
      String.fromCharCode(c.charCodeAt(0) - CP_KATA_A + CP_HIRA_A),
    );
  }

  (function add_css() {
    const style = document.createElement('style');
    style.append(
      document.createTextNode(/* css */ `
      :root {
        --color-modal-mask: unset;
      }

      .wk-modal__content {
        /* top: unset;
        bottom: 0; */
        border-radius: 5px;
        box-shadow: 0 0 4px 2px gray;
      }

      .subject-section__meanings-title {
        min-width: 6em;
      }

      .user-synonyms__form_container::-webkit-scrollbar {
        display: none;
      }

      .${entryClazz} .user-synonym__button-text {
        line-height: 1.5em;
      }

      .${entryClazz} .user-synonym__button-text + .user-synonym__button-text::before,
      .${entryClazz} .user-synonyms_item + .user-synonyms_item::before {
        content: ', ';
      }

      .${entryClazz} details,
      .${entryClazz} .wk-title-custom {
        margin-top: 1em;
      }

      .${entryClazz} summary {
        cursor: pointer;
      }
      `),
    );
    document.head.append(style);
  })();
})();
