// ==UserScript==
// @name        WK Custom Review Question (KunOn+)
// @namespace   WK_KunOn
// @description Changes the text of the Review or Lesson Quiz question. Specifies ON or KUN reading for Kanji. Options to have the text in English or Japanese.
// @author      polv
// @match       https://www.wanikani.com/extra_study/session*
// @match       https://www.wanikani.com/review/session*
// @match       https://www.wanikani.com/subjects/review*
// @match       https://www.wanikani.com/subjects/extra_study*
// @match       https://www.wanikani.com/subjects/lesson/quiz*
// @match       https://preview.wanikani.com/extra_study/session*
// @match       https://preview.wanikani.com/review/session*
// @match       https://preview.wanikani.com/subjects/review*
// @match       https://preview.wanikani.com/subjects/extra_study*
// @match       https://preview.wanikani.com/subjects/lesson/quiz*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @homepage    https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/kun-on.user.js
// @version     1.0.0
// @license     Do what you want with it (Preferably improve it).
// @grant       none
// ==/UserScript==

// @ts-check
(function () {
  'use strict';

  /**
   * Language options
   * English "en", Japanese "ja"
   */
  let strLang = 'en';

  // Vars to compose the replacement question string
  let strKanji = 'Kanji';
  let strRadical = 'Radical';
  let strVocab = 'Vocabulary';
  let strMeaning = 'Meaning';
  let strReading = 'Reading';
  let strOn = "On'yomi";
  let strKun = "Kun'yomi";
  let strNan = 'Nanori';
  let strName = 'Name';

  // Translations
  switch (strLang) {
    case 'ja':
      strKanji = '漢字';
      strRadical = '部首';
      strVocab = '単語';
      strMeaning = '意味';
      strReading = '読み';
      strOn = '音読み';
      strKun = '訓読み';
      strNan = '名乗り';
      strName = '名前';
      break;
  }

  window.addEventListener('willShowNextQuestion', (e) => {
    if ('detail' in e) {
      const { subject, questionType } = /**
       * @type {{
       *  questionType: 'reading' | 'meaning',
       *  subject: {
       *    type: 'Radical' | 'Kanji' | 'Vocabulary',
       *    primary_reading_type?: 'onyomi' | 'kunyomi' | 'nanori'
       *  }
       * }} */ (e.detail);

      const el_category = document.querySelector(
        '[data-quiz-input-target="category"]',
      );
      const el_questionType = document.querySelector(
        '[data-quiz-input-target="questionType"]',
      );

      if (el_category && el_questionType) {
        const obs_category = new MutationObserver(() => {
          el_category.setAttribute('lang', strLang);
          el_category.textContent = (() => {
            switch (subject.type) {
              case 'Radical':
                return strRadical;
              case 'Kanji':
                return strKanji;
            }
            return strVocab;
          })();
          obs_category.disconnect();
        });
        obs_category.observe(el_category, { childList: true });

        const obs_questionType = new MutationObserver(() => {
          el_questionType.setAttribute('lang', strLang);
          el_questionType.textContent = (() => {
            if (questionType === 'reading') {
              switch (subject.primary_reading_type) {
                case 'onyomi':
                  return strOn;
                case 'kunyomi':
                  return strKun;
                case 'nanori':
                  return strNan;
              }
              return strReading;
            }

            if (subject.type === 'Radical') return strName;

            return strMeaning;
          })();

          obs_questionType.disconnect();
        });
        obs_questionType.observe(el_questionType, { childList: true });
      }
    }
  });
})();
