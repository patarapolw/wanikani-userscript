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

  modAnswerChecker.register((e, tryCheck) => {
    return null;
  });
})();
