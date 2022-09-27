// ==UserScript==
// @name         WaniKani Autoplay Audio
// @namespace    polv/wanikani
// @version      0.1
// @description  Autoplay audio with customizability (via Anki-Connect). Also with sentences (via ImmersionKit.com).
// @author       polv
// @match        *://www.wanikani.com/review/session*
// @match        *://www.wanikani.com/extra_study/session*
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1057854
// @require      https://raw.githubusercontent.com/patarapolw/wanikani-userscript/master/userscripts/types/ankiconnect.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

// TODO:
// @match        *://www.wanikani.com/lesson/session*
// @match        *://www.wanikani.com/*vocabulary/*

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/item-info.d.ts" />
/// <reference path="./types/ankiconnect.d.ts" />
(function () {
  'use strict';

  // OPTIONS
  // TODO: Use wkof's dialog

  /**
   * @type {ScriptOptions}
   *
   * Remove Anki keys to disable lookup
   */
  const OPTS = {
    RANDOMIZE_VOCABULARY_AUDIO: true,
    AUTOPLAY_AUDIO_IN_LESSONS: false,
    HIDE_SENTENCE_JA: true,
    HIDE_SENTENCE_EN: 'remove',
    ANKI: {
      yomichan: {
        model: 'yomichan-terms',
        fields: {
          Japanese: { lang: 'ja' },
          JapaneseWaniKani: { lang: 'ja', furigana: false },
          Reading: {},
          Sentence: { lang: 'ja' },
          SentenceAudio: {},
          SentenceMeaning: {},
        },
      },
    },
  };
  deepFreeze(OPTS);

  /**
   * @typedef {{
   * RANDOMIZE_VOCABULARY_AUDIO: boolean
   * AUTOPLAY_AUDIO_IN_LESSONS: boolean
   * HIDE_SENTENCE_JA: HidingOptions
   * HIDE_SENTENCE_EN: HidingOptions
   * ANKI?: { [type in 'yomichan']?: NoteType }
   * }} ScriptOptions
   *
   * @typedef {boolean | 'remove'} HidingOptions
   *
   * @typedef {{
   * model: string,
   * fields: Record<string, FieldMeta>
   * }} NoteType
   *
   * @typedef {{
   * lang?: string
   * furigana?: boolean
   * }} FieldMeta
   */

  // SCRIPT START

  const HTML_CLASS = 'wk-autoplay';
  const ankiconnect = new AnkiConnect();

  document.head.append(
    Object.assign(document.createElement('style'), {
      className: HTML_CLASS,
      innerHTML: `
    .${HTML_CLASS}.hidden-until-hover:not(:hover) {
      background-color:#ccc;
      color:#ccc;
      text-shadow:none;
    }`,
    }),
  );

  const sentence = {
    ja: '',
    audio: '',
    en: '',
  };

  wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .forType('vocabulary')
    .notify((state) => {});

  wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .forType('vocabulary')
    .under('reading')
    .appendAtTop('WaniKani Autoplay', (state) => {
      return undefined;
    });

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
   *
   * @type {<T>(object: T) => T}
   */
  function deepFreeze(object) {
    // Retrieve the property names defined on object
    const propNames = Object.getOwnPropertyNames(object);

    // Freeze properties before freezing self

    for (const name of propNames) {
      const value = object[name];

      if (value && typeof value === 'object') {
        deepFreeze(value);
      }
    }

    return Object.freeze(object);
  }
})();
