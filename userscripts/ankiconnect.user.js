// ==UserScript==
// @name         WaniKani Get Data from Anki
// @namespace    polv/wanikani
// @version      0.1
// @description  Get data from Anki into WaniKani's pages and review
// @author       polv
// @match        *://www.wanikani.com/review/session*
// @match        *://www.wanikani.com/extra_study/session*
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1057854
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ankiweb.net
// @grant        none
// ==/UserScript==

// TODO:
// @match        *://www.wanikani.com/lesson/session*
// @match        *://www.wanikani.com/*vocabulary/*
// @match        *://www.wanikani.com/*kanji/*
// @match        *://www.wanikani.com/*radical/*

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/item-info.d.ts" />
(function () {
  'use strict';

  /**
   * @typedef {{
   * lang?: string
   * furigana?: boolean
   * }} FieldMeta
   */

  /**
   * @type {{ [noteType: string]: Record<string, FieldMeta> }}
   */
  const ANKI_TARGET = {
    'yomichan-terms': {
      Japanese: { lang: 'ja' },
      JapaneseWaniKani: { lang: 'ja', furigana: false },
      Reading: {},
      Sentence: { lang: 'ja' },
      SentenceAudio: {},
      SentenceMeaning: {},
    },
  };

  const ANKI_CLASS = 'wk-anki-connect';

  document.head.append(
    Object.assign(document.createElement('style'), {
      className: ANKI_CLASS,
      innerHTML: `
    .hidden-until-hover:not(:hover) {
      background-color:#ccc;
      color:#ccc;
      text-shadow:none;
    }`,
    }),
  );

  /************************************************************ */

  /**
   *
   * @param {string} action
   * @param {*} params
   * @param {number} version
   * @returns
   */
  function AnkiConnect(action, params = {}, version = 6) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('error', () => reject('failed to issue request'));
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (Object.getOwnPropertyNames(response).length != 2) {
            throw 'response has an unexpected number of fields';
          }
          if (!response.hasOwnProperty('error')) {
            throw 'response is missing required error field';
          }
          if (!response.hasOwnProperty('result')) {
            throw 'response is missing required result field';
          }
          if (response.error) {
            throw response.error;
          }
          resolve(response.result);
        } catch (e) {
          reject(e);
        }
      });

      xhr.open('POST', 'http://127.0.0.1:8765');
      xhr.send(JSON.stringify({ action, version, params }));
    });
  }

  const NOTE_TYPES = Object.keys(ANKI_TARGET);

  // Check first if AnkiConnect is running and can be connected at all. Error in console.
  AnkiConnect('multi', {
    actions: NOTE_TYPES.map((modelName) => ({
      action: 'modelFieldNames',
      params: { modelName },
    })),
  }).then((r) => {
    /**
     * @type {Array}
     */
    let rError = [];
    function tryThrowError() {
      if (rError.length) {
        throw rError;
      }
      rError = [];
    }

    /**
     * @type {Record<string, string[]>}
     */
    const noteTypeMap = {};

    /** @type {Array<string[]>} */ (r).map((r0, i) => {
      const noteType = NOTE_TYPES[i];
      noteTypeMap[noteType] = r0;
      for (const field of Object.keys(ANKI_TARGET[noteType])) {
        if (!noteTypeMap[noteType].includes(field)) {
          rError.push({ noteType, field, error: 'no such field' });
        }
      }
    });
    tryThrowError();

    /**
     *
     * @type {import("./types/wanikani").WKCurrent<'vocabulary'> | undefined}
     */
    let current;
    const sentence = {
      ja: '',
      audio: '',
      en: '',
    };

    const onNewVocabulary = () => {
      if (!current) return;

      sentence.ja = '';
      sentence.audio = '';
      sentence.en = '';

      const noteType = 'yomichan-terms';
      const fields = {
        Japanese: 'Japanese',
        JapaneseWaniKani: 'JapaneseWaniKani',
        Reading: 'Reading',
        Sentence: 'Sentence',
        SentenceAudio: 'SentenceAudio',
        SentenceMeaning: 'SentenceMeaning',
      };

      if (!ANKI_TARGET[noteType]) {
        rError.push({ noteType, error: 'no such noteType' });
      }
      tryThrowError();

      const ankiFields = Object.keys(ANKI_TARGET[noteType]);

      for (const field of Object.keys(fields)) {
        if (!ankiFields.includes(field)) {
          rError.push({ noteType, field, error: 'no such field' });
        }
      }
      tryThrowError();

      const { voc, kana = [] } = current;

      AnkiConnect('findNotes', {
        query: [
          `note:"${noteType}"`,
          `(${[
            `${fields.Japanese}:${voc}`,
            `${fields.JapaneseWaniKani}:${voc}`,
          ].join(' OR ')})`,
          `(${kana.map((r) => `${fields.Reading}:${r}`).join(' OR ')})`,
        ].join(' '),
      })
        .then((notes) => AnkiConnect('notesInfo', { notes }))
        .then((notes) => {
          /**
           * @typedef {Record<string, { value: string }>} Fields
           * @typedef {{ fields: Fields }} Note
           */

          /**
           * @param {Note} note
           * @param {string} fieldName
           */
          function getField(note, fieldName) {
            let { value = '' } = note.fields[fieldName] || {};

            const meta = NOTE_TYPES[noteType][fieldName];
            let isFurigana = meta.furigana;
            if (!isFurigana) {
              isFurigana = meta.lang === 'ja' && meta.furigana !== false;
            }

            if (isFurigana) {
              value = value
                .replace(/(\[.+?\])(.)/g, '$1 $2')
                .replace(
                  /(^| )([^ \[]+)\[([^\]]+)\]/g,
                  '<ruby>$1<rt>$2</rt></ruby>',
                );
            }

            return value;
          }

          const filteredNotes = /** @type {Array<Note>} */ (notes)
            .sort((n1, n2) =>
              !getField(n1, fields.JapaneseWaniKani)
                ? 1
                : !getField(n2, fields.JapaneseWaniKani)
                ? -1
                : 0,
            )
            .filter((n) =>
              getField(n, fields.Reading)
                .split('\n')
                .some((r) => kana.includes(r.trim())),
            );

          const n =
            filteredNotes.find((n) => getField(n, fields.SentenceAudio)) ||
            filteredNotes[0];

          if (n) {
            sentence.ja = getField(n, fields.Sentence);
            sentence.en = getField(n, fields.SentenceMeaning);

            const m = /\[sound\:(.+?)\]/.exec(
              getField(n, fields.SentenceAudio),
            );
            if (m) {
              const filename = m[1];

              // [sound:https://...] works in AnkiDroid
              if (/:\/\//.exec(filename)) {
                sentence.audio = m[1];
              } else {
                AnkiConnect('retrieveMediaFile', { filename }).then((r) => {
                  let mimeType = 'audio/mpeg';
                  const ext = m[1].replace(/^.+\./, '');
                  switch (ext) {
                    default:
                      mimeType = `audio/${ext}`;
                  }

                  sentence.audio = `data:${mimeType};base64,${r}`;
                });
              }
            }
          }
        });
    };

    $.jStorage.listenKeyChange('currentItem', onNewVocabulary);
    onNewVocabulary();

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Triggering updates on lessons and reviews

    wkItemInfo
      .on('lesson,lessonQuiz,review,extraStudy')
      .forType('vocabulary')
      .under('reading')
      .appendAtTop('Anki Example', (state) => {
        if (!current) return;

        Array.from(
          document.querySelectorAll('.' + ANKI_CLASS + ':not(style)'),
        ).map((it) => it.remove());

        /**
         * @type {(HTMLAudioElement | HTMLParagraphElement)[]}
         */
        const outputEls = [];

        if (current.aud) {
          /**
           * @type {Record<string, HTMLAudioElement>}
           */
          const vocabAudioEls = {};
          current.aud.map((a) => {
            const identifier = `${a.pronunciation}:${a.voice_actor_id}`;
            let audioEl = vocabAudioEls[identifier];
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.className = ANKI_CLASS;
              audioEl.style.display = 'none';

              vocabAudioEls[identifier] = audioEl;
            }

            const source = document.createElement('source');
            source.type = a.content_type;
            source.src = a.url;

            audioEl.append(source);
          });

          const vocabAudioElArray = Object.values(vocabAudioEls);
          const n = Math.floor(vocabAudioElArray.length * Math.random());
          outputEls.push(vocabAudioElArray[n]);
          vocabAudioElArray.map((el, i) => (i === n ? el.remove() : null));
        }

        if (sentence.ja) {
          const p = document.createElement('p');
          p.className = `${ANKI_CLASS} hidden-until-hover`;
          p.lang = 'ja';
          p.innerHTML = sentence.ja;
          outputEls.push(p);
        }

        if (sentence.en) {
          const p = document.createElement('p');
          p.className = ANKI_CLASS;
          p.innerHTML = sentence.en;
          outputEls.push(p);
        }

        if (sentence.audio) {
          const audio = document.createElement('audio');
          audio.className = ANKI_CLASS;
          audio.src = sentence.audio;
          audio.controls = true;
          outputEls.push(audio);
        }

        if (outputEls.length) {
          const audioEls = /** @type {HTMLAudioElement[]} */ (
            outputEls.filter((el) => el instanceof HTMLAudioElement)
          );
          if (audioEls[0]) {
            audioEls[0].autoplay = true;
            audioEls.map((el, i) => {
              const nextEl = audioEls[i + 1];
              if (nextEl) {
                el.onended = () => {
                  nextEl.play();
                };
              }
            });
          }

          if (outputEls.every((el) => el.style.display === 'none')) {
            document.body.append(...outputEls);
            return;
          }

          const output = document.createElement('div');
          output.append(...outputEls);
          return output;
        }
      });
  });
})();
