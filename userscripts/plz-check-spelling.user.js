// ==UserScript==
// @name         WaniKani Please Check Spelling
// @namespace    http://www.wanikani.com
// @version      0.1.0
// @description  A lenient no-misspelling script (No Cigar)
// @author       polv
// @match        https://www.wanikani.com/extra_study/session*
// @match        https://www.wanikani.com/review/session*
// @match        https://www.wanikani.com/subjects/*
// @match        https://preview.wanikani.com/extra_study/session*
// @match        https://preview.wanikani.com/review/session*
// @match        https://preview.wanikani.com/subjects*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @license      MIT
// @homepage     https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/plz-check-spelling.user.js
// @grant        none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  // Hook into App Store
  try {
    $('.app-store-menu-item').remove();
    $(
      '<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>',
    ).insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")'));
    // @ts-ignore
    window.appStoreRegistry = window.appStoreRegistry || {};
    // @ts-ignore
    window.appStoreRegistry[GM_info.script.uuid] = GM_info;
    // @ts-ignore
    localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry);
  } catch (e) {}

  //Create regex profiles (katakana matches need hiragana counterparts included)
  /** Prepends Hiragana counterpart to any Katakana string input
   * @param {String} char - A one character long string that may be a Katakana character
   * @returns {String} A single character if the input is Hiragana or "ー"; A two character string of (hopefully) Hiragana-Katakana pairs in square brackets (that can form a regex) if not.
   * @bug Will attempt to pair any character that is not Hiragana or "ー"
   */
  function pairKatakana(char) {
    if (/^[\u3040-\u309fー]$/.test(char)) {
      //is char hiragana or "ー"?
      return char;
    } else {
      //set up pairs
      var offset = -6 * 16; //katakana block: 30a0-30ff
      var katakana = String.fromCharCode(char.charCodeAt(0) + offset);
      return '[' + char + katakana + ']';
    }
  }

  /** Returns true if the character is Kana
   */
  function isKana(char) {
    return /^[\u3040-\u30ff]$/.test(char);
  }

  /** Creates regex from a vocabulary item that matches the Kana in that item.

*/
  function makeRegex(cV) {
    var r = '^'; //start the regex string
    for (var c = 0; c < cV.length; c++) {
      if (isKana(cV[c])) {
        r += pairKatakana(cV[c]);
      } else {
        //we have a non-kana character
        if (cV[c] !== '〜') {
          //I doubt WK will be adding Kana suffixes but just covering all the bases to be safe.
          r += '(.+)'; // unknown number of characters in reading (corresponding to kanji), capturing in groups for versatility
          while (c < cV.length && !isKana(cV[c + 1])) {
            c++; //skip non-kana characters (already have ".+" in our regex, do not need to add more)
          }
        }
      }
    }
    r += '$'; // End of regex
    return new RegExp(r);
  }

  //Get answerChecker Object
  //Stimulus.controllers.filter((x)=>{return x.answerChecker;})[0]
  var getAnswerChecker = function (timeout) {
    var start = Date.now();

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
  };

  /** @typedef Evaluation
   * @property {boolean} [accurate] - If true, the answer matched one of the possible answers
   * @property {boolean} [exception] - If true, the exception animation will run and the answer will not be processed.
   * @property {boolean} [multipleAnswers] - If true, Wanikani has more than one correct answer for the ReviewItem, a notification will be shown saying this.
   * @property {boolean} [passed] - If true, The answer is determined to be close enough to pass. In the case that accurate is false, the answer will pass with a notification to check your answer.
   */
  /** Can be either a meaning or a reading
   */
  var dyek = function (answerChecker) {
    //console.log("main function loading");
    //Get the answerChecker object out of Stimulus Controllers
    //var quizController = Stimulus.controllers.filter((x)=>{return x.answerChecker;})[0];
    //var answerChecker = quizController&&quizController.answerChecker;

    //Boy, I do love to wrap this function don't I?
    answerChecker.oldEvaluate = answerChecker.evaluate.bind(answerChecker);
    /** New evaluate function to send an exception if it doesn't meet our requirements
     */

    /* April 2023 evaluate now takes an object as its only argument
  {
          questionType: this.currentQuestionType,
          response: e,
          item: this.currentSubject,
          userSynonyms: t,
          inputChars: this.inputChars
      }
  */
    answerChecker.evaluate = function (e, n, i, t) {
      var getQuestionType = function () {
        return e.questionType; //this.currentQuestionType?
        //return $(".quiz-input__question-type").innerHTML.toLowerCase();
      };
      var getQuestionCategory = function () {
        return e.item.type.toLowerCase();
        //return i.subject_category.toLowerCase();
        //return $(".quiz-input__question-category").innerHTML.toLowerCase();
      };
      var isVoc = (() => {
        return getQuestionCategory() === 'vocabulary';
      })();

      var getCurrentItem = function () {
        return e.item.characters;
        //return answerChecker.currentSubject.characters;
      };

      var getResponse = function () {
        return e.response;
      };

      //jStorage no longer used in WaniKani
      /** @type {string} */
      var questionType = getQuestionType();
      /** @type {string} */
      var category = getQuestionCategory();
      /** @type {string} */
      var cI = getCurrentItem();

      if (questionType === 'reading') {
        if (category === 'vocabulary') {
          if (!makeRegex(cI).test(getResponse())) {
            return { exception: 'Bro, Do you even Kana?' };
          }
        }
      } else {
        const result = answerChecker.oldEvaluate(e, n, i, t);
        if (result.passed && !result.accurate) {
          const response = getResponse().toLocaleLowerCase();
          const {
            meanings = [],
            auxiliary_meanings = [],
            userSynonyms = [],
          } = e.item;

          const re = new RegExp(
            `^(${[
              ...meanings,
              ...userSynonyms,
              ...auxiliary_meanings.map((m) => m.meaning),
            ]
              .map((m) => {
                m = m.toLocaleLowerCase();

                const tokens = m.split(' ');
                const isVerb = tokens[0] === 'to';

                const out = [];

                tokens.map((t, i) => {
                  let ed = ' ';
                  if (!/^(to|on|of|and|with)$/i.test(t)) {
                    if (!isVerb) {
                      t = makePlural(t);
                    }
                    if (t === 'something') {
                      t = t + '?';
                    } else {
                      ed = ' *';
                    }
                  }
                  out.push(t);
                  if (i < tokens.length - 1) {
                    out.push(ed);
                  }
                });
                return out.join('');
              })
              .join('|')})$`,
            'i',
          );
          console.log(re, result);
          if (!re.test(response)) {
            result.exception = 'Please check if your spelling is correct';
          }
        }
        return result;
      }

      return answerChecker.oldEvaluate(e, n, i, t);
    };
  };

  function makePlural(s) {
    if (s.length > 2) {
      if (s.endsWith('y')) {
        return s.substring(0, s.length - 1) + '(y|ies)';
      }

      if (s.endsWith('ies')) {
        return s.substring(0, s.length - 3) + '(y|ies)';
      }

      if (s.endsWith('s')) {
        s = s.substring(0, s.length - 1);
      }
      return s + 's?';
    }

    return s;
  }

  getAnswerChecker(60000).then(dyek);
})();
