// ==UserScript==
// @name         WaniKani Multiple Answer Input (2023)
// @namespace    http://www.wanikani.com
// @version      2.0.4
// @description  Input multiple readings/meanings into Wanikani
// @author       polv
// @match        https://www.wanikani.com/extra_study/session*
// @match        https://www.wanikani.com/review/session*
// @match        https://www.wanikani.com/subjects/*
// @match        https://preview.wanikani.com/extra_study/session*
// @match        https://preview.wanikani.com/review/session*
// @match        https://preview.wanikani.com/subjects/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @homepage     https://greasyfork.org/en/scripts/466680-wanikani-multiple-answer-input-2023
// @supportURL   https://community.wanikani.com/t/userscript-multiple-input-answer-2023/61931
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/mulitple-answer.user.js
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
     *
     * @param {TryEvaluationFunction} fn
     */
    register(fn) {
      this.mods.push(fn);
    }

    constructor() {
      // Automatically init on new instance
      this.init();
    }

    async init() {
      const answerChecker = await this.getAnswerChecker(60000);

      answerChecker.oldEvaluate = answerChecker.evaluate.bind(answerChecker);

      /** @type {(fns: TryEvaluationFunction[]) => EvaluationFunction} */
      const evaluateWith = (fns) => {
        return (e) => {
          for (const fn of fns) {
            const r = fn(e, evaluateWith(fns.filter((it) => it !== fn)));
            if (r) return r;
          }
          return answerChecker.oldEvaluate(e);
        };
      };

      answerChecker.evaluate = evaluateWith(this.mods);
    }

    /**
     * Get answerChecker Object
     * @param {number} timeout
     * @returns {Promise<{
     *   oldEvaluate: EvaluationFunction
     *   evaluate: EvaluationFunction
     * }>}
     */
    async getAnswerChecker(timeout) {
      //Stimulus.controllers.filter((x)=>{return x.answerChecker;})[0]
      const start = Date.now();

      function waitForAnswerChecker(resolve, reject) {
        // @ts-ignore
        const Stimulus = window.Stimulus;
        if (
          Stimulus &&
          Stimulus.controllers.filter((x) => {
            return x.answerChecker;
          })[0]
        ) {
          var answerChecker = Stimulus.controllers.filter((x) => {
            return x.answerChecker;
          })[0].answerChecker;
          resolve(answerChecker);
        } else if (timeout && Date.now() - start >= timeout)
          reject(new Error('timeout'));
        else setTimeout(waitForAnswerChecker.bind(this, resolve, reject), 30);
      }

      return new Promise(waitForAnswerChecker);
    }
  }

  // @ts-ignore
  window.modAnswerChecker = window.modAnswerChecker || new ModAnswerChecker();
  /** @type {ModAnswerChecker} */
  // @ts-ignore
  const modAnswerChecker = window.modAnswerChecker;

  //////////////////////////////////////////////////////////////////////////////

  /**
   * !Multiple Answer Input section
   * @see https://community.wanikani.com/t/userscript-multiple-answer-input-revamped/49075/44
   */
  modAnswerChecker.register((e, tryCheck) => {
    const splitter = e.questionType === 'reading' ? /・/g : /(?:;|\/)/g;
    const isKanjiReading =
      e.item.subject_category === 'Kanji' && e.questionType === 'reading';

    /** @type {Record<string, Evaluation[]>} */
    const evalActionMap = {};

    for (const subResponse of e.response.split(splitter)) {
      let response = subResponse.trim();
      if (!response) continue;

      const result = tryCheck({ ...e, response });

      const sect = evalActionMap[result.action] || [];
      sect.push(result);
      evalActionMap[result.action] = sect;
    }

    for (const actionType of ['fail', 'retry', 'pass']) {
      if (evalActionMap[actionType]) {
        const result =
          evalActionMap[actionType].find((r) => r.message) ||
          evalActionMap[actionType][0];

        if (actionType === 'retry' && isKanjiReading && evalActionMap['pass']) {
          result.action = 'pass';
        }

        return result;
      }
    }

    return null;
  });
})();
