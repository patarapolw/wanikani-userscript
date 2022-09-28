// ==UserScript==
// @name         WaniKani Autoplay Sentence Audio
// @namespace    polv/wanikani
// @version      0.1
// @description  Autoplay audio sentences (via ImmersionKit.com), with customizability (via Anki-Connect)
// @author       polv
// @match        *://www.wanikani.com/review/session*
// @match        *://www.wanikani.com/extra_study/session*
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1057854
// @require      https://raw.githubusercontent.com/patarapolw/wanikani-userscript/master/userscripts/shared/ankiconnect.js
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
/// <reference path="./types/immersion-kit.d.ts" />

/// <reference path="./types/autoplay.user.d.ts" />
(function () {
  'use strict';

  // OPTIONS
  // TODO: Use wkof's dialog

  /**
   * @type {ScriptOptions}
   *
   * Remove Anki key to disable lookup
   */
  const OPTS = {
    // RANDOMIZE_VOCABULARY_AUDIO: true,
    AUTOPLAY_AUDIO_IN_LESSONS: false,
    HIDE_SENTENCE_JA: true,
    HIDE_SENTENCE_EN: 'remove',
    IMMERSION_KIT: {
      nSentences: 3,
      priority: [
        'Death Note',
        'Hunter x Hunter',
        'Fullmetal Alchemist Brotherhood',
        "Kino's Journey",
        'Your Name',
        'Bakemonogatari',
      ],
    },
    ANKI: {
      model: 'yomichan-terms',
      searchFields: {
        vocabulary: ['JapaneseWanikani', 'Japanese'],
        reading: ['Reading'],
      },
      outFields: {
        sentence: [
          {
            ja: 'Sentence',
            audio: 'SentenceAudio',
            en: 'SentenceMeaning',
          },
        ],
      },
    },
  };
  deepFreeze(OPTS);

  // SCRIPT START

  const HTML_CLASS = 'wk-autoplay';
  const FURIGANA_FIELDS = new Set(
    OPTS.ANKI
      ? [
          ...OPTS.ANKI.searchFields.vocabulary,
          ...OPTS.ANKI.outFields.sentence.map((s) => s.ja).filter((f) => f),
        ]
      : undefined,
  );
  const ankiconnect = new AnkiConnect();

  const HIDDEN_UNTIL_HOVER_CLASS = 'hidden-until-hover';

  document.head.append(
    Object.assign(document.createElement('style'), {
      className: 'style--' + HTML_CLASS,
      innerHTML: `
    .${HTML_CLASS} .${HIDDEN_UNTIL_HOVER_CLASS}:not(:hover) {
      background-color:#ccc;
      color:#ccc;
      text-shadow:none;
    }`,
    }),
  );

  /**
   *
   * @type {import("./types/wanikani").WKCurrent<'vocabulary'> | undefined}
   */
  let current;
  /**
   * @type {ISentence[]}
   */
  let sentences = [];

  const onNewVocabulary = () => {
    sentences = [];

    const c = $.jStorage.get('currentItem');
    if (!c || !('voc' in c)) {
      current = undefined;
      return;
    }
    current = c;

    if (OPTS.ANKI) {
      const { model: noteType, searchFields, outFields } = OPTS.ANKI;
      const { voc, kana } = c;

      ankiconnect
        .send('findNotes', {
          query: [
            `"note:${noteType}"`,
            `(${searchFields.vocabulary
              .map((f) => `"${f}:${voc}"`)
              .join(' OR ')})`,
            `(${kana
              .flatMap((r) => searchFields.reading.map((f) => `"${f}:${r}"`))
              .join(' OR ')})`,
          ].join(' '),
        })
        .then((notes) => ankiconnect.send('notesInfo', { notes }))
        .then((notes) => {
          /**
           * @param {Pick<INote, 'fields'>} note
           * @param {string} fieldName
           */
          function getField(note, fieldName) {
            let { value = '' } = note.fields[fieldName] || {};

            if (FURIGANA_FIELDS.has(fieldName)) {
              value = value
                .replace(/(\[.+?\])(.)/g, '$1 $2')
                .replace(
                  /(^| )([^ \[]+)\[([^\]]+)\]/g,
                  '<ruby>$1<rt>$2</rt></ruby>',
                );
            }

            return value;
          }

          const filteredNotes = notes
            .sort((n1, n2) =>
              [n1, n2]
                .map((n1) =>
                  searchFields.vocabulary.findIndex((f) => getField(n1, f)),
                )
                .reduce((prev, c) => prev - c),
            )
            .filter((n) =>
              searchFields.reading
                .flatMap((f) => getField(n, f).split('\n'))
                .some((r) => kana.includes(r.trim())),
            );

          const n =
            filteredNotes.find((n) =>
              outFields.sentence.map((f) => getField(n, f.audio)),
            ) || filteredNotes[0];

          if (n) {
            sentences = outFields.sentence.map((f) => {
              const out = {
                ja: f.ja ? getField(n, f.ja) : undefined,
                en: f.en ? getField(n, f.en) : undefined,
                audio: '',
              };

              const m = /\[sound\:(.+?)\]/.exec(getField(n, f.audio));
              if (m) {
                const filename = m[1];

                // [sound:https://...] works in AnkiDroid
                if (/:\/\//.exec(filename)) {
                  out.audio = m[1];
                } else {
                  ankiconnect
                    .send('retrieveMediaFile', { filename })
                    .then((r) => {
                      let mimeType = 'audio/mpeg';
                      const ext = m[1].replace(/^.+\./, '');
                      switch (ext) {
                        default:
                          mimeType = `audio/${ext}`;
                      }

                      out.audio = `data:${mimeType};base64,${r}`;
                    });
                }
              }

              return out;
            });
            return sentences;
          }
        })
        .then((ss = []) => {
          if (!ss.length) {
            fetch(
              `https://api.immersionkit.com/look_up_dictionary?keyword=${voc}`,
            )
              .then((r) => r.json())
              .then((r) => {
                const {
                  data: [{ examples }],
                } = /** @type {ImmersionKitResult} */ (r);

                /** @type {(typeof examples)[]} */
                const sortedExamples = [];
                /** @type {typeof examples} */
                let remainingExamples = examples;

                for (const p of OPTS.IMMERSION_KIT.priority) {
                  /** @type {typeof examples} */
                  const currentExamples = [];
                  /** @type {typeof examples} */
                  const nextRemainingExamples = [];

                  for (const ex of remainingExamples) {
                    if (ex.deck_name === p) {
                      currentExamples.push(ex);
                    } else {
                      nextRemainingExamples.push(ex);
                    }
                  }

                  sortedExamples.push(currentExamples);
                  remainingExamples = nextRemainingExamples;
                }

                sortedExamples.push(remainingExamples);

                for (const ss of sortedExamples) {
                  if (sentences.length >= OPTS.IMMERSION_KIT.nSentences) {
                    break;
                  }

                  while (ss.length > 0) {
                    const i = Math.floor(Math.random() * ss.length);
                    sentences.push({
                      ja: ss[i].sentence,
                      audio: ss[i].sound_url,
                      en: ss[i].translation,
                    });
                    ss.splice(i, 1);

                    if (sentences.length >= OPTS.IMMERSION_KIT.nSentences) {
                      break;
                    }
                  }
                }
              });
          }
        });
    }
  };

  $.jStorage.listenKeyChange('currentItem', onNewVocabulary);
  onNewVocabulary();

  wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .forType('vocabulary')
    .under('reading')
    .appendAtTop('WaniKani Autoplay', () => {
      if (!current) {
        return;
      }

      Array.from(document.querySelectorAll('.' + HTML_CLASS)).map((it) =>
        it.remove(),
      );

      const outputDiv = document.createElement('div');
      outputDiv.className = HTML_CLASS;

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
        outputDiv.append(vocabAudioElArray[n]);
        vocabAudioElArray.map((el, i) => (i !== n ? el.remove() : null));
      }

      let hasSentences = false;
      sentences.map((s) => {
        const section = document.createElement('section');

        if (s.ja) {
          const p = document.createElement('p');
          if (OPTS.HIDE_SENTENCE_JA) {
            p.className = HIDDEN_UNTIL_HOVER_CLASS;
          }
          p.lang = 'ja';
          p.innerText = s.ja;
          section.append(p);
        }

        if (s.audio) {
          const audio = document.createElement('audio');
          audio.src = s.audio;
          audio.controls = true;
          audio.setAttribute('data-type', 'external');

          const p = document.createElement('p');
          p.append(audio);
          section.append(p);
        }

        if (s.en) {
          const p = document.createElement('p');
          if (OPTS.HIDE_SENTENCE_EN) {
            p.className = HIDDEN_UNTIL_HOVER_CLASS;
          }
          p.lang = 'ja';
          p.innerText = s.en;
          section.append(p);
        }

        if (section.innerHTML) {
          outputDiv.append(section);
          hasSentences = true;
        }
      });

      if (outputDiv.innerHTML) {
        const audioEls = Array.from(outputDiv.querySelectorAll('audio'));
        for (let i = 0; i < audioEls.length; i++) {
          const el = audioEls[i];

          if (i === 0) {
            el.autoplay = true;
          }

          if (el.hasAttribute('data-type')) {
            break;
          } else {
            const nextEl = audioEls[i + 1];
            if (nextEl) {
              el.onended = () => {
                nextEl.play();
              };
            }
          }
        }

        if (hasSentences) {
          return outputDiv;
        }

        document.body.append(outputDiv);
        return;
      }
      return;
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
