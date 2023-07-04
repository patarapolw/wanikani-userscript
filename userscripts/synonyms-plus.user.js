// ==UserScript==
// @name         WaniKani User Synonyms++
// @namespace    http://www.wanikani.com
// @version      0.1.0
// @description  Better and Not-only User Synonyms
// @author       polv
// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @homepage     https://greasyfork.org/en/scripts/?
// @supportURL   https://community.wanikani.com/t/?/?
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/synonyms-plus.user.js
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  const entryClazz = 'synonyms-plus';

  /** @typedef {'whitelist' | 'blacklist' | 'warn'} AuxiliaryType */

  /**
   * @typedef {{
   *   questionType: string
   *   item: {
   *     type: string
   *     characters: string
   *     readings?: string[]
   *     auxiliary_readings?: {
   *       reading: string
   *       type: AuxiliaryType
   *     }[]
   *     meanings: string[]
   *     auxiliary_meanings: {
   *       meaning: string
   *       type: AuxiliaryType
   *     }[]
   *     subject_category: string
   *     primary_reading_type?: string
   *   }
   *   userSynonyms: string[]
   *   response: string
   * }} EvaluationParam
   */

  /**
   * @typedef {{
   *   action: 'pass' | 'fail' | 'retry'
   *   message: null | {
   *     text: string
   *     type: 'itemInfoException' | 'answerException'
   *   }
   * }} Evaluation
   */

  /** @typedef {((e: EvaluationParam) => Evaluation)} EvaluationFunction */
  /** @typedef {((e: EvaluationParam, check: EvaluationFunction) => Evaluation | null)} TryEvaluationFunction */

  class ModAnswerChecker {
    /**
     * @type {TryEvaluationFunction[]}
     */
    mods = [];
    /**
     * @type {{
     *   oldEvaluate?: EvaluationFunction
     *   evaluate: EvaluationFunction
     * } | null}
     */
    answerChecker = null;

    /**
     *
     * @param {TryEvaluationFunction} fn
     */
    register(fn) {
      this.mods.push(fn);
    }

    constructor() {
      // Automatically init on new instance
      window.addEventListener('turbo:load', (e) => {
        // @ts-ignore
        const url = e.detail.url;
        if (!url) return;

        /**
         * e.g.
         * https://www.wanikani.com/subjects/lesson/quiz?queue=${subjectIds.join('-')}
         * https://www.wanikani.com/subjects/review
         * https://www.wanikani.com/subjects/extra_study?queue_type=${queueType}
         */
        if (/(session|quiz|review|extra_study)/.test(url)) {
          // @ts-ignore
          const Stimulus = window.Stimulus;
          if (!Stimulus) return;

          const startDate = +new Date();
          const intervalId = setInterval(() => {
            this.answerChecker =
              Stimulus.controllers.find((x) => {
                return x.answerChecker;
              })?.answerChecker || null;

            if (this.answerChecker) {
              clearInterval(intervalId);

              if (this.answerChecker.oldEvaluate) return;
              const answerChecker = this.answerChecker;

              console.log('Found new answerChecker');

              const oldEvaluate = answerChecker.evaluate.bind(answerChecker);
              answerChecker.oldEvaluate = oldEvaluate;

              /** @type {(fns: TryEvaluationFunction[]) => EvaluationFunction} */
              const evaluateWith = (fns) => {
                return (e) => {
                  for (const fn of fns) {
                    const r = fn(
                      e,
                      evaluateWith(fns.filter((it) => it !== fn)),
                    );
                    if (r) return r;
                  }
                  return oldEvaluate(e);
                };
              };

              answerChecker.evaluate = evaluateWith(this.mods);
            }

            if (startDate + 5000 < +new Date()) {
              clearInterval(intervalId);
            }
          }, 500);
        }
      });
    }
  }

  // @ts-ignore
  window.modAnswerChecker = window.modAnswerChecker || new ModAnswerChecker();
  /** @type {ModAnswerChecker} */
  // @ts-ignore
  const modAnswerChecker = window.modAnswerChecker;

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // @ts-ignore
  const _Dexie = /** @type {typeof import('dexie').default} */ (Dexie);
  /**
   * @typedef {{
   *   id: string;
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

  /** @type {EntrySynonym} */
  let entry = {
    id: '',
    aux: [],
  };

  modAnswerChecker.register((e, tryCheck) => {
    answerCheckerParam = e;
    e = JSON.parse(JSON.stringify(e));

    e.item.readings = e.item.readings || [];
    e.item.auxiliary_readings = e.item.auxiliary_readings || [];

    for (const { questionType, ...it } of entry.aux) {
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
    // @ts-ignore
    entry.id = String(ev.detail.subject.id);
    entry.aux = [];

    db.synonym.get(entry.id).then((it) => {
      if (it) {
        entry = it;
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

    entry.aux.map((it) => {
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

    let m;
    if (
      (m = /wanikani\.com\/subject_info\/(\d+)/.exec(
        fetchResponse.response.url,
      ))
    ) {
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
        entry = it;
        updateAux();
      }
    });

    let isFirstRender = true;

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
        isFirstRender = false;
      }
      elInput.autocomplete = 'off';
      elInput.onkeydown = (ev) => {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
      };

      elForm.onsubmit = (ev) => {
        let [, sign, str] = elInput.value.split(/([\-?])/);
        if (!str) return;

        const questionType = 'meaning';

        /** @type {AuxiliaryType | null} */
        let type = null;

        if (sign === '-') {
          type = 'blacklist';
        } else if (sign === '?') {
          type = 'warn';
        }

        if (type) {
          ev.preventDefault();
          setTimeout(() => {
            updateAux();
            elInput.value = '';
          });

          if (
            !entry.aux.find(
              (a) =>
                a.questionType === questionType &&
                a.type === type &&
                a.text === str,
            )
          ) {
            entry.aux.push({
              questionType,
              text: str,
              type,
              message: 'Not the meaning YOU are looking for',
            });
            db.synonym.put(entry, subject_id);
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

      for (const a of entry.aux) {
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
          entry.aux = entry.aux.filter((a0) => a0.text !== a.text);
          db.synonym.put(entry, subject_id);
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

  function capitalize(s) {
    return s.replace(
      /[a-z]+/gi,
      (p) => p[0].toLocaleUpperCase() + p.substring(1),
    );
  }

  function normalize(s) {
    return s.toLocaleLowerCase().replace(/\W/g, ' ').trim();
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

      .${entryClazz}  .user-synonyms__form_container::-webkit-scrollbar {
        display: none;
      }
      `),
    );
    document.head.append(style);
  })();
})();
