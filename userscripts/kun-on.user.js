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
// @homepage    https://community.wanikani.com/t/userscript-wk-custom-review-question-kunon-2023-version/61449
// @source      https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/kun-on.user.js
// @version     1.1.0
// @license     MIT
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

  /**
   * Whether to hide subjectType string, and rely on color instead.
   */
  let has_subjectType = true;

  //
  // Edit replacement string to your heart's content.
  //

  // subjectType HTML
  let htmlKanji = 'Kanji';
  let htmlRadical = 'Radical';
  let htmlVocab = 'Vocabulary';

  // questionType HTML
  let htmlMeaning = 'Meaning';
  let htmlName = 'Name';

  let htmlReading = 'Reading';

  let htmlOn = "ON'YOMI";
  let htmlKun = `<span style="color: cyan">kun'yo</span>mi`;
  let htmlNanori = 'Nanori (^o^)';

  // Translations HTML
  switch (strLang) {
    case 'ja':
      htmlKanji = '漢字:';
      htmlRadical = '部首:';
      htmlVocab = '単語:';

      htmlMeaning = '意味';
      htmlName = '名前';

      htmlReading = '読み方';

      htmlOn = '音読み';
      htmlKun = '<span style="color: cyan">くんよ</span>み';
      htmlNanori = '名乗り (^o^)';
      break;
  }

  const SEL_category = '[data-quiz-input-target="category"]';
  const SEL_questionType = '[data-quiz-input-target="questionType"]';

  // CSS
  add_css(/* css */ `
  ${SEL_category} {
    text-transform: unset;
  }

  ${SEL_questionType} {
    text-transform: unset;
    ${strLang === 'ja' ? 'font-weight: unset;' : ''}
  }

  ${SEL_questionType} [data-kunon-reading-type="nanori"] {
    color: bisque;
  }
  `);

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

      const el_category = document.querySelector(SEL_category);
      const el_questionType = document.querySelector(SEL_questionType);

      if (el_category && el_questionType) {
        const obs_category = new MutationObserver(() => {
          el_category.setAttribute('lang', strLang);
          el_category.innerHTML = `<span data-kunon-subject-type="${
            subject.type
          }">${
            has_subjectType
              ? (() => {
                  switch (subject.type) {
                    case 'Radical':
                      return htmlRadical;
                    case 'Kanji':
                      return htmlKanji;
                  }
                  return htmlVocab;
                })()
              : ''
          }</span>`;

          obs_category.disconnect();
        });
        obs_category.observe(el_category, { childList: true });

        const obs_questionType = new MutationObserver(() => {
          el_questionType.setAttribute('lang', strLang);
          el_questionType.innerHTML = `<span data-kunon-question-type="${questionType}">${(() => {
            if (questionType === 'reading') {
              const { primary_reading_type } = subject;

              if (primary_reading_type) {
                return `<span data-kunon-reading-type="${primary_reading_type}">${(() => {
                  switch (primary_reading_type) {
                    case 'onyomi':
                      return htmlOn;
                    case 'kunyomi':
                      return htmlKun;
                    case 'nanori':
                      return htmlNanori;
                  }
                  return htmlReading;
                })()}</span>`;
              }
              return htmlReading;
            }

            if (subject.type === 'Radical') return htmlName;

            return htmlMeaning;
          })()}</span>`;

          obs_questionType.disconnect();
        });
        obs_questionType.observe(el_questionType, { childList: true });
      }
    }
  });

  function add_css(css) {
    const style = document.createElement('style');
    style.append(document.createTextNode(css));
    document.head.append(style);
  }
})();
