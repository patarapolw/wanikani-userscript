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
// @match       https://www.wanikani.com/subjects/*/lesson*
// @match       https://preview.wanikani.com/extra_study/session*
// @match       https://preview.wanikani.com/review/session*
// @match       https://preview.wanikani.com/subjects/review*
// @match       https://preview.wanikani.com/subjects/extra_study*
// @match       https://preview.wanikani.com/subjects/lesson/quiz*
// @match       https://preview.wanikani.com/subjects/*/lesson*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @homepage    https://community.wanikani.com/t/userscript-wk-custom-review-question-kunon-2023-version/61449
// @source      https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/kun-on.user.js
// @version     1.1.1
// @license     MIT
// @grant       none
// ==/UserScript==

// @ts-check
/// <reference path="./types/wkof.d.ts" />
(function () {
  'use strict';

  /**
   * Language options
   * English "en", Japanese "ja"
   * @type {string}
   */
  const defaultLang = 'en';

  /**
   * Whether to hide subjectType string, and rely on color instead.
   */
  const default_has_subjectType = true;

  //
  // Edit replacement string to your heart's content.
  //

  // subjectType HTML
  const enKanji = 'Kanji';
  const enRadical = 'Radical';
  const enVocab = 'Vocabulary';

  // questionType HTML
  const enMeaning = 'Meaning';
  const enName = 'Name';

  const enReading = 'Reading';

  const enOn = `<span style="color: yellow">ON'YOMI</span>`;
  const enKun = `<span style="color: cyan">kun'yo</span>mi`;
  const enNanori = 'Nanori (^o^)';

  const jaKanji = '漢字:';
  const jaRadical = '部首:';
  const jaVocab = '単語:';

  const jaMeaning = '意味';
  const jaName = '名前';

  const jaReading = '読み方';

  const jaOn = '<span style="color: yellow">音読み</span>';
  const jaKun = '<span style="color: cyan">くんよ</span>み';
  const jaNanori = '名乗り (^o^)';

  /**
   * Whether to use wkof Settings dialog and ignore in-script settings
   */
  const USE_WKOF = true;

  // CONSTANTS
  const SCRIPT_ID = 'WK_KunOn';
  const SEL_category = '[data-quiz-input-target="category"]';
  const SEL_questionType = '[data-quiz-input-target="questionType"]';

  let cfg = USE_WKOF ? /** @type {ScriptSettings} */ ({}) : newScriptSettings();

  /** @type {HTMLStyleElement} */
  let elStyle;
  setScriptCSS();

  /**
   *
   * @typedef {{
   *   Language: string
   *   'Hide Subject Type': boolean
   *   Radical: string
   *   Kanji: string
   *   Vocabulary: string
   *   Meaning: string
   *   Reading: string
   *   RadicalName: string
   *   Kunyomi: string
   *   Onyomi: string
   *   Nanori: string
   * }} ScriptSettings
   */

  function newScriptSettings(o = /** @type {ScriptSettings} */ ({})) {
    o.Language = o.Language || defaultLang;
    o['Hide Subject Type'] = !default_has_subjectType;

    o.Radical = o.Language === 'ja' ? jaRadical : enRadical;
    o.Kanji = o.Language === 'ja' ? jaKanji : enKanji;
    o.Vocabulary = o.Language === 'ja' ? jaVocab : enVocab;

    o.Meaning = o.Language === 'ja' ? jaMeaning : enMeaning;
    o.Reading = o.Language === 'ja' ? jaReading : enReading;
    o.RadicalName = o.Language === 'ja' ? jaName : enName;

    o.Kunyomi = o.Language === 'ja' ? jaKun : enKun;
    o.Onyomi = o.Language === 'ja' ? jaOn : enOn;
    o.Nanori = o.Language === 'ja' ? jaNanori : enNanori;

    return o;
  }

  // @ts-ignore
  if (USE_WKOF && typeof wkof !== 'undefined') {
    /**
     * @typedef {import('./types/wkof').Core.Module
     * & import('./types/wkof').Menu
     * & import('./types/wkof').Settings
     * } TWKOF
     */

    // @ts-ignore
    const WKOF = /** @type {TWKOF} */ (wkof);
    WKOF.include('Menu,Settings');
    WKOF.ready('Menu,Settings')
      .then(() => {
        WKOF.Menu.insert_script_link({
          name: 'kunon',
          title: 'Custom Review Questions (KunOn+)',
          submenu: 'Settings',
          on_click: openSettings,
        });
      })
      .then(() => {
        return WKOF.Settings.load(SCRIPT_ID, cfg);
      })
      .then(() => {
        cfg = /** @type {any} */ (WKOF.settings[SCRIPT_ID]);
        updateSettings();
      });

    function updateSettings() {
      setScriptCSS();
      setSubjectType();
      setQuestionType();
    }

    function openSettings() {
      const dialog = new WKOF.Settings({
        script_id: SCRIPT_ID,
        title: 'Custom Review Question Settings',
        on_save: () => {
          updateSettings();
        },
        content: {
          Language: {
            type: 'dropdown',
            label: 'Language',
            default: 'en',
            content: {
              en: 'English',
              ja: 'Japanese',
            },
            on_change: function (k, v) {
              WKOF.settings[SCRIPT_ID][k] = v;
              newScriptSettings(/** @type {any} */ (WKOF.settings[SCRIPT_ID]));
              updateSettings();
              dialog.refresh();
            },
          },
          'Hide Subject Type': {
            type: 'checkbox',
            label: 'Hide Subject Type',
            hover_tip: `Don't show whether it is Radical, Kanji or Vocabulary`,
            default: !default_has_subjectType,
          },
          divider: {
            type: 'divider',
          },
          Subject: {
            type: 'group',
            label: 'Subject Label',
            content: {
              Radical: {
                type: 'input',
                label: 'Radical',
                default: enRadical,
              },
              Kanji: {
                type: 'input',
                label: 'Kanji',
                default: enKanji,
              },
              Vocabulary: {
                type: 'input',
                label: 'Vocabulary',
                default: enVocab,
              },
            },
          },
          QuestionType: {
            type: 'group',
            label: 'Question Type',
            content: {
              Meaning: {
                type: 'input',
                label: 'Meaning',
                default: enMeaning,
              },
              Reading: {
                type: 'input',
                label: 'Reading',
                default: enReading,
              },
              RadicalName: {
                type: 'input',
                label: 'Radical name',
                default: enName,
              },
              'Kanji Reading': {
                type: 'group',
                label: 'Kanji Reading',
                content: {
                  Kunyomi: {
                    type: 'input',
                    label: `Kun'yomi`,
                    default: enKun,
                  },
                  Onyomi: {
                    type: 'input',
                    label: `On'yomi`,
                    default: enOn,
                  },
                  Nanori: {
                    type: 'input',
                    label: 'Nanori',
                    default: enName,
                  },
                },
              },
            },
          },
          'Reset Settings': {
            type: 'button',
            label: 'Reset Settings',
            on_click: () => {
              newScriptSettings(/** @type {any} */ (WKOF.settings[SCRIPT_ID]));
              updateSettings();
              dialog.refresh();
            },
          },
        },
      });

      dialog.open();
    }
  }

  /**
   * @type {{
   *  questionType: 'reading' | 'meaning',
   *  subject: {
   *    type: 'Radical' | 'Kanji' | 'Vocabulary',
   *    primary_reading_type?: 'onyomi' | 'kunyomi' | 'nanori'
   *  }
   * } | null}
   */
  let itemDetail = null;

  function setSubjectType() {
    if (!itemDetail) return;

    const el_category = document.querySelector(SEL_category);
    if (!el_category) return;

    el_category.setAttribute('lang', cfg.Language);
    el_category.innerHTML = `<span data-kunon-subject-type="${
      itemDetail.subject.type
    }">${
      cfg['Hide Subject Type']
        ? ''
        : (() => {
            switch (itemDetail.subject.type) {
              case 'Radical':
                return cfg.Radical;
              case 'Kanji':
                return cfg.Kanji;
            }
            return cfg.Vocabulary;
          })()
    }</span>`;
  }

  function setQuestionType() {
    if (!itemDetail) return;

    const el_questionType = document.querySelector(SEL_questionType);
    if (!el_questionType) return;

    const {
      questionType,
      subject: { type, primary_reading_type },
    } = itemDetail;

    el_questionType.setAttribute('lang', cfg.Language);
    el_questionType.innerHTML = `<span data-kunon-question-type="${questionType}">${(() => {
      if (questionType === 'reading') {
        if (primary_reading_type) {
          return `<span data-kunon-reading-type="${primary_reading_type}">${(() => {
            switch (primary_reading_type) {
              case 'onyomi':
                return cfg.Onyomi;
              case 'kunyomi':
                return cfg.Kunyomi;
              case 'nanori':
                return cfg.Nanori;
            }
            return cfg.Reading;
          })()}</span>`;
        }
        return cfg.Reading;
      }

      if (type === 'Radical') return cfg.RadicalName;

      return cfg.Meaning;
    })()}</span>`;
  }

  window.addEventListener('willShowNextQuestion', (e) => {
    if ('detail' in e) {
      itemDetail = /** @type {any} */ (e.detail);

      const el_category = document.querySelector(SEL_category);
      const el_questionType = document.querySelector(SEL_questionType);

      if (el_category && el_questionType) {
        const obs_category = new MutationObserver(() => {
          setSubjectType();
          obs_category.disconnect();
        });
        obs_category.observe(el_category, { childList: true });

        const obs_questionType = new MutationObserver(() => {
          setQuestionType();
          obs_questionType.disconnect();
        });
        obs_questionType.observe(el_questionType, { childList: true });
      }
    }
  });

  window.addEventListener('didAnswerQuestion ', () => {
    setTimeout(() => {
      if (
        location.pathname.includes('lesson') &&
        !location.pathname.includes('quiz')
      ) {
        itemDetail = null;
      }
    }, 100);
  });

  function setScriptCSS() {
    const css = /* css */ `
    ${SEL_category} [data-kunon-subject-type] {
      text-transform: unset;
    }

    ${SEL_questionType} [data-kunon-question-type] {
      text-transform: unset;
      ${cfg.Language === 'ja' ? 'font-weight: normal;' : ''}
    }

    ${SEL_questionType} [data-kunon-question-type] [data-kunon-reading-type="nanori"] {
      color: bisque;
    }
    `;

    if (elStyle) {
      elStyle.textContent = css;
    } else {
      elStyle = document.createElement('style');
      elStyle.setAttribute('data-userscript', SCRIPT_ID);
      elStyle.append(document.createTextNode(css));
      document.head.append(elStyle);
    }
  }
})();
