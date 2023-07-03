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
// @homepage     https://greasyfork.org/en/scripts/?
// @supportURL   https://community.wanikani.com/t/?/?
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/synonyms-plus.user.js
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  /** @typedef {'whitelist' | 'blacklist' | 'warning'} AuxiliaryType */

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

  //////////////////////////////////////////////////////////////////////////////

  /** @type {EvaluationParam | null} */
  let answerCheckerParam = null;

  modAnswerChecker.register((e, tryCheck) => {
    answerCheckerParam = e;
    return null;
  });

  addEventListener('willShowNextQuestion', (ev) => {
    answerCheckerParam = null;
  });

  addEventListener('turbo:load', (ev) => {
    // @ts-ignore
    const url = e.detail.url;
    if (!url) return;

    /**
     * e.g.
     * https://www.wanikani.com/subjects/lesson/quiz?queue=${subjectIds.join('-')}
     * https://www.wanikani.com/subjects/review
     * https://www.wanikani.com/subjects/extra_study?queue_type=${queueType}
     */
    if (!/(session|quiz|review|extra_study)/.test(url)) {
      answerCheckerParam = null;
    }
  });

  addEventListener('turbo:frame-render', (ev) => {
    const el = /** @type {HTMLElement} */ (ev.target);
    // @ts-ignore
    const { fetchResponse } = ev.detail;

    const [, subject_id] =
      /wanikani\.com\/user_synonyms\/new\?.*subject_id=(\d+)/.exec(
        fetchResponse.response.url,
      ) || [];
    if (!subject_id) return;

    const elContainer = el.querySelector('.user-synonyms__form_container');
    if (!elContainer) return;

    const elForm = el.querySelector('form.user-synonyms__form');
    if (!(elForm instanceof HTMLFormElement)) return;

    const elInput = el.querySelector('input[type="text"]');
    if (!(elInput instanceof HTMLInputElement)) return;

    elForm.addEventListener('submit', (ev) => {
      let [, sign, str] = elInput.value.split(/([\-?])/);
      if (str) {
        ev.preventDefault();
      }
    });

    if (answerCheckerParam) {
      const { questionType, item } = answerCheckerParam;
      const aux =
        questionType === 'reading'
          ? item.auxiliary_readings || []
          : item.auxiliary_meanings;

      elContainer.append(
        (() => {
          const el = document.createElement('details');

          const title = document.createElement('summary');
          el.append(title);
          title.innerText = 'WK Auxiliary';
          title.style.cursor = 'pointer';

          const elButtonSet = document.createElement('div');
          el.append(elButtonSet);
          elButtonSet.className = 'user-synonyms__synonym-buttons';

          for (const a of aux) {
            const elButton = document.createElement('a');
            elButton.className = 'user-synonyms__synonym-button';
            elButton.setAttribute('data-auxiliary-type', a.type);

            const btn = document.createElement('i');
            btn.className = 'wk-icon fa-regular fa-times';
            elButton.append(btn);

            const label = document.createElement('span');
            label.className = 'user-synonym__button-text';
            label.innerText = 'reading' in a ? a.reading : a.meaning;
            elButton.append(label);

            elButtonSet.append(elButton);
          }
          return el;
        })(),
      );
    }
  });

  (function add_css() {
    const style = document.createElement('style');
    const css = document.createTextNode(/* css */ `
    .user-synonyms__synonym-buttons [data-auxiliary-type^="w"] {
      background-color: yellow;
    }

    .user-synonyms__synonym-buttons [data-auxiliary-type^="b"] {
      background-color: red;
    }
    `);

    style.append(css);
    document.head.append(style);
  })();
})();
