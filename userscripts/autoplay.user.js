// ==UserScript==
// @name         WaniKani Autoplay Sentence Audio
// @namespace    polv/wanikani
// @version      0.1.2
// @description  Autoplay audio sentences (via ImmersionKit.com), with customizability (via Anki-Connect)
// @author       polv
// @match        *://www.wanikani.com/dashboard
// @match        *://www.wanikani.com/*/session*
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1057854
// @require      https://greasyfork.org/scripts/452285-ankiconnect/code/ankiconnect.js?version=1099556
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @icon         https://emoji.discourse-cdn.com/apple/loudspeaker.png?v=12
// @license      MIT
// @grant        none
// ==/UserScript==

// TODO:
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
  // TODO: Use OPTIONS dialog, like from wkof

  /**
   * See https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/types/autoplay.user.d.ts for typing
   *
   * @type {WKAutoplayOptions}
   *
   * Remove IMMERSION_KIT or ANKI key to disable lookup
   */
  const OPTS = {
    HIDE_SENTENCE_JA: true,
    HIDE_SENTENCE_EN: false,
    NUMBER_OF_SENTENCES: 3,
    IMMERSION_KIT: {
      priority: [],
    },
    ANKI: undefined,
  };

  // SCRIPT START

  (window.unsafeWindow || window).audioAutoplay = false;

  const HTML_CLASS = 'wk-autoplay-sentence';

  const HIDDEN_UNTIL_HOVER_CLASS = 'hidden-until-hover';
  document.head.append(
    Object.assign(document.createElement('style'), {
      className: 'style--' + HTML_CLASS,
      innerHTML: `
    .${HTML_CLASS} .${HIDDEN_UNTIL_HOVER_CLASS}:not(:hover) {
      background-color:#ccc;
      color:#ccc;
      text-shadow:none;
    }

    .${HTML_CLASS} section[data-sentence] {
      display: grid;
      grid-template-columns: 4em 1fr;
      gap: 10px;
      width: 100%;
      align-items: center;
      margin-bottom: initial !important;
    }

    .${HTML_CLASS} .unstyled {
      all: unset;
    }

    .${HTML_CLASS} button.audio-btn {
      width: 1.5em;
    }

    .${HTML_CLASS} label.pinning > input[type="checkbox"] {
      /* visibility: hidden; */
    }

    .${HTML_CLASS} label.pinning > input[type="checkbox"]:not(:disabled) + ::after {
      background-image: url(https://emoji.discourse-cdn.com/apple/white_large_square.png?v=12);
    }

    .${HTML_CLASS} label.pinning > input[type="checkbox"]:checked + ::after {
      background-image: url(https://emoji.discourse-cdn.com/apple/pushpin.png?v=12);
    }

    .${HTML_CLASS} details {
      margin-top: 2em;
      display: revert;
    }

    .${HTML_CLASS} summary {
      display: revert;
    }
    `,
    }),
  );

  /**
   * Configurable object, accessible via JavaScript console
   *
   * @type {WKAutoplayObject}
   */
  let OB;

  const makeOB = () => {
    const KEY_OB = 'wkAutoplaySentence';
    const KEY_IMMERSION_KIT = KEY_OB + '--' + 'IMMERSION_KIT';
    const KEY_ANKI = KEY_OB + '--' + 'ANKI';

    const imLookup = OB?.IMMERSION_KIT?._lookup || {};

    /** @type {WKAutoplayObject} */
    const obj = {
      ...clone(OPTS),
      load(s) {
        const { IMMERSION_KIT: vImkit, ANKI: vAnki, ...vOB } = s || {};

        /** @type {WKAutoplayImmersionKit} */
        const IMMERSION_KIT = deepAssign(
          OB.IMMERSION_KIT,
          vImkit || lsGet(KEY_IMMERSION_KIT),
        );

        const ANKI = deepAssign(OB.ANKI, vAnki || lsGet(KEY_ANKI));

        Object.assign(
          OB,
          deepAssign(OB, Object.keys(vOB).length ? vOB : lsGet(KEY_OB)),
        );

        if (IMMERSION_KIT && Object.keys(IMMERSION_KIT).length) {
          OB.IMMERSION_KIT = IMMERSION_KIT;

          IMMERSION_KIT.availableDecks = IMMERSION_KIT.availableDecks || [];
          IMMERSION_KIT.user = IMMERSION_KIT.user || {};

          Object.entries(IMMERSION_KIT.user).map(([k, v]) => {
            imLookup[k] = imLookup[k] || v;
          });
          IMMERSION_KIT._lookup = imLookup;

          IMMERSION_KIT.list = (vocab) => {
            vocab = vocab || current?.voc;
            if (!vocab) return [];

            const ls = Array.from(IMMERSION_KIT.user[vocab] || []);
            let lookup = Array.from(IMMERSION_KIT._lookup[vocab] || []);

            for (const deck of IMMERSION_KIT.priority) {
              lookup = lookup.filter((s) => {
                if (s.deck_name === deck) {
                  ls.push(s);
                  return false;
                }
                return true;
              });
            }

            ls.push(...lookup);

            return ls;
          };

          IMMERSION_KIT.add = (sentence_id, vocab) => {
            vocab = vocab || current?.voc;
            if (!vocab) return null;

            const s = (imLookup[vocab] || []).find(
              (s0) => s0.sentence_id === sentence_id,
            );
            if (s) {
              stopAllAudio();

              const audio = new Audio();
              audio.src = s.sound_url;
              audio.onended = () => {
                audio.remove();
              };
              audio.play();

              const ss = IMMERSION_KIT.user[vocab] || [];
              if (!ss.find((s0) => s0.id === s.id)) {
                ss.push(s);
                IMMERSION_KIT.user[vocab] = ss;

                OB.save();
                return s;
              }
            }
            return null;
          };

          IMMERSION_KIT.autoplay = (sentence_id, vocab) => {
            vocab = vocab || current?.voc;
            if (!vocab) return null;

            const s = (imLookup[vocab] || []).find(
              (s0) => s0.sentence_id === sentence_id,
            );
            if (s) {
              stopAllAudio();

              const audio = new Audio();
              audio.src = s.sound_url;
              audio.onended = () => {
                audio.remove();
              };
              audio.play();

              IMMERSION_KIT.user[vocab] = [
                s,
                ...(IMMERSION_KIT.user[vocab] || []).filter(
                  (s0) => s0.id !== s.id,
                ),
              ];

              OB.save();
              return s;
            }
            return null;
          };

          IMMERSION_KIT.search = async (voc) => {
            if (!voc) return [];
            return db.imKitSearch
              .get(voc)
              .then((r) => {
                return r
                  ? db.imKitExample
                      .bulkGet(r.sentence_id)
                      .then((rs) => rs.filter((r) => r))
                  : fetch(
                      `https://api.immersionkit.com/look_up_dictionary?keyword=${voc}&category=anime`,
                    )
                      .then((r) => r.json())
                      .then((r) => {
                        /** @type {ImmersionKitExample[]} */
                        const examples = r.data[0].examples;

                        if (examples.length) {
                          try {
                            db.imKitExample.bulkAdd(examples).finally(() => {
                              db.imKitSearch.add({
                                id: voc,
                                sentence_id: examples.map((ex) => ex.id),
                              });
                            });
                          } catch (e) {}
                        }

                        return examples;
                      });
              })
              .then((r) => {
                const examples = /** @type {ImmersionKitExample[]} */ (r);

                IMMERSION_KIT.availableDecks = [
                  ...new Set([
                    ...IMMERSION_KIT.availableDecks,
                    ...examples.map((s) => s.deck_name),
                  ]),
                ].sort();

                const existingIds = new Set(sentences.map((s) => s.id));

                /** @type {typeof examples} */
                let remainingExamples = examples.filter((ex) => {
                  return !existingIds.has(ex.sentence_id);
                });

                /**
                 *
                 * @param {(ex: (typeof examples)[0]) => boolean} filterFn
                 */
                const addExamples = (filterFn) => {
                  /** @type {{[type: string]: (typeof examples)} & {'': {[type: string]: (typeof examples)}}} */
                  const sortedExamples = {};

                  for (const p of IMMERSION_KIT.priority) {
                    sortedExamples[p] = [];
                    remainingExamples = remainingExamples.filter((ex) => {
                      if (ex.deck_name === p && !filterFn(ex)) {
                        sortedExamples[p].push(ex);
                        return false;
                      }
                      return true;
                    });
                  }

                  sortedExamples[''] = remainingExamples.reduce((prev, c) => {
                    if (filterFn(c)) return prev;
                    prev[c.deck_name] = prev[c.deck_name] || [];
                    prev[c.deck_name].push(c);
                    return prev;
                  }, {});

                  IMMERSION_KIT._lookup[voc] = [
                    ...IMMERSION_KIT.priority.map((p) => sortedExamples[p]),
                    Object.values(sortedExamples['']).reduce(
                      (prev, c) => [...prev, ...c],
                      [],
                    ),
                  ]
                    .flatMap((ss) => shuffleArray(ss))
                    .map((s) => {
                      sentences.push(formatImKit(s));
                      return s;
                    });
                };

                addExamples((s) =>
                  s.sentence.replace(/\(.+?\)/g, ' ').includes(voc),
                );
                addExamples(() => true);
                sentences.push(
                  ...shuffleArray(remainingExamples).map((s) => formatImKit(s)),
                );
                const sentenceIds = sentences.map((s) => s.id);
                sentences.splice(
                  0,
                  sentences.length,
                  ...sentences.filter(
                    (s, i) => sentenceIds.indexOf(s.id) === i,
                  ),
                );

                appender.renew();

                return IMMERSION_KIT._lookup[voc];
              });
          };
        }

        if (ANKI && Object.keys(ANKI).length) {
          OB.ANKI = ANKI;
        }

        return OB;
      },
      save() {
        const { IMMERSION_KIT, ANKI, ...others } = OB;
        lsSet(KEY_IMMERSION_KIT, IMMERSION_KIT);
        lsSet(KEY_ANKI, ANKI);
        lsSet(KEY_OB, others);
        return OB;
      },
      reset: makeOB,
      dump() {
        return JSON.parse(cleanStringify(OB));
      },
    };

    return obj;
  };

  OB = makeOB();
  OB.load();

  Object.assign(window.unsafeWindow || window, { wkAutoplaySentence: OB });

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // @ts-ignore
  const _Dexie = /** @type {typeof import('dexie').default} */ (Dexie);
  /**
   * @typedef {{ id: string; sentence_id: number[] }} EntryImKitSearch
   */

  class Database extends _Dexie {
    /** @type {import('dexie').Table<ImmersionKitExample>} */
    imKitExample;

    /** @type {import('dexie').Table<EntryImKitSearch>} */
    imKitSearch;

    constructor() {
      super(HTML_CLASS);
      this.version(1).stores({
        imKitExample: 'id,category,deck_name,sentence,&sentence_id,*tags',
        imKitSearch: 'id,*sentence_id',
      });
    }
  }

  const db = new Database();

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  const FURIGANA_FIELDS = new Set(
    OB.ANKI
      ? [
          ...OB.ANKI.searchFields.vocabulary,
          ...OB.ANKI.outFields.sentence.map((s) => s.ja).filter((f) => f),
        ]
      : undefined,
  );
  const ankiconnect = new AnkiConnect();

  /** @type {import("./types/wanikani").WKCurrent<'vocabulary'>} */
  let current;
  /** @type {WKAutoplaySentence[]} */
  const sentences = [];
  /** @type {HTMLElement[]} */
  const autoplayDivArray = [];

  let currentlyPlayingSentence = '';

  let isAnkiConnect = !!OB.ANKI;

  const autoRevealer = new MutationObserver(() => {
    const answerForm = document.querySelector('#answer-form fieldset');
    if (answerForm instanceof HTMLElement && answerForm.className) {
      setTimeout(() => {
        const btn = document.getElementById('option-item-info');
        if (btn instanceof HTMLElement && !btn.classList.contains('active')) {
          btn.click();
        }
      }, 50);
    }
  });

  const onNewVocabulary = async () => {
    autoRevealer.disconnect();
    autoplayDivArray.map((el) => el.remove());
    autoplayDivArray.splice(0, autoplayDivArray.length);
    sentences.splice(0, sentences.length);

    let key = 'currentItem';
    if (document.URL.includes('/lesson/session')) {
      key = $.jStorage.get('l/quizActive')
        ? 'l/currentQuizItem'
        : 'l/currentLesson';
    }

    const c =
      /** @type {import("./types/wanikani").WKCurrent<'vocabulary'>} */ (
        $.jStorage.get(key)
      );

    if (!c || !('voc' in c)) return;

    let qType = '';
    switch (key) {
      case 'currentItem': {
        qType = $.jStorage.get('questionType') || '';
        break;
      }
      case 'l/currentQuizItem': {
        qType = $.jStorage.get('l/questionType') || '';
        break;
      }
    }

    if (qType) {
      if (qType === 'reading') {
        autoRevealer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      } else {
        return;
      }
    }

    current = c;
    const { voc, kana } = current;

    const { ANKI } = OB;
    if (isAnkiConnect && ANKI) {
      const { query, searchFields, outFields } = ANKI;

      const noteIds = await ankiconnect
        .send('findNotes', {
          query: [
            query,
            `(${searchFields.vocabulary
              .map((f) => `"${f}:${voc}"`)
              .join(' OR ')})`,
            `(${kana
              .flatMap((r) => searchFields.reading.map((f) => `"${f}:${r}"`))
              .join(' OR ')})`,
          ].join(' '),
        })
        .catch((e) => {
          console.error(e);
          console.error(
            'Cannot findNotes. Did you forget to install Anki and enable Anki-Connect (https://foosoft.net/projects/anki-connect/)?',
          );
          isAnkiConnect = false;
          return [];
        });

      if (noteIds.length) {
        await ankiconnect
          .send('notesInfo', { notes: noteIds })
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
              sentences.push(
                ...outFields.sentence
                  .map((f) => {
                    const out = {
                      id: (f.id ? getField(n, f.id) : '') || `anki--${f.audio}`,
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
                  })
                  .filter(
                    (s) =>
                      (OB.HIDE_SENTENCE_JA === 'remove' ? false : s.ja) ||
                      s.audio,
                  ),
              );

              if (sentences.length) {
                appender.renew();
              }
            }
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }

    const { IMMERSION_KIT } = OB;
    if (IMMERSION_KIT) {
      sentences.push(
        ...shuffleArray(IMMERSION_KIT.user[voc] || []).map((s) =>
          formatImKit(s),
        ),
      );
      await IMMERSION_KIT.search(voc);

      OB.save();
    }
  };

  const appender = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .forType('vocabulary')
    .under('reading')
    .spoiling('reading')
    .appendAtTop('Autoplay Sentences', (state) => {
      if (!current) return;
      if (current.id !== state.id) return;

      const outputDiv = document.createElement('div');
      outputDiv.className = HTML_CLASS;

      /** @type {AudioPlayer | null} */
      let vocabAudioEl = null;
      if (current.aud) {
        /**
         * @type {Record<string, AudioPlayer>}
         */
        const vocabAudioEls = {};
        current.aud.map((a) => {
          const identifier = `${a.pronunciation}:${a.voice_actor_id}`;
          let audioEl = vocabAudioEls[identifier];
          if (!audioEl) {
            audioEl = createAudioPlayer('vocab', identifier);
            audioEl.span.style.display = 'none';

            vocabAudioEls[identifier] = audioEl;
          }

          const source = document.createElement('source');
          source.type = a.content_type;
          source.src = a.url;

          audioEl.audio.append(source);
        });

        const vocabAudioElArray = Object.values(vocabAudioEls);
        const n = Math.floor(vocabAudioElArray.length * Math.random());
        vocabAudioEl = vocabAudioElArray[n];
        outputDiv.append(vocabAudioEl.span);
        vocabAudioElArray.map((el, i) => (i !== n ? el.span.remove() : null));
      }

      let hasSentences = false;
      /** @type {AudioPlayer[]} */
      const sentenceAudioElArray = [];

      /**
       *
       * @param {HTMLElement} target
       * @param {WKAutoplaySentence[]} ss
       */
      const createSentenceSection = (target, ss) => {
        return ss.map((s) => {
          const section = document.createElement('section');
          section.setAttribute('data-sentence', s.id);

          const player = createAudioPlayer('sentence', s.id);
          player.audio.src = s.audio;
          sentenceAudioElArray.push(player);

          if (s.imKit && OB.IMMERSION_KIT) {
            const { imKit } = s;
            const { IMMERSION_KIT } = OB;

            if (
              IMMERSION_KIT &&
              IMMERSION_KIT.user[current.voc] &&
              IMMERSION_KIT.user[current.voc].find(
                (s0) => s0.sentence_id === imKit.sentence_id,
              )
            ) {
              player.checkbox.checked = true;
            }

            player.checkbox.onchange = () => {
              IMMERSION_KIT.user[current.voc] =
                IMMERSION_KIT.user[current.voc] || [];
              if (player.checkbox.checked) {
                IMMERSION_KIT.user[current.voc].unshift(imKit);
              } else {
                IMMERSION_KIT.user[current.voc].filter(
                  (s0) => s0.sentence_id !== imKit.sentence_id,
                );
              }
              OB.save();
            };
          } else {
            player.checkbox.disabled = true;
          }

          section.append(player.span);

          const mainEl = document.createElement('div');
          mainEl.style.flexGrow = '1';
          section.append(mainEl);

          if (s.ja && OB.HIDE_SENTENCE_JA !== 'remove') {
            const p = document.createElement('p');
            if (OB.HIDE_SENTENCE_JA) {
              p.className = HIDDEN_UNTIL_HOVER_CLASS;
            }
            p.lang = 'ja';
            p.innerHTML = s.ja;
            mainEl.append(p);
          }

          if (s.en && OB.HIDE_SENTENCE_EN !== 'remove') {
            const p = document.createElement('p');
            if (OB.HIDE_SENTENCE_EN) {
              p.className = HIDDEN_UNTIL_HOVER_CLASS;
            }
            p.lang = 'ja';
            p.innerHTML = s.en;
            mainEl.append(p);
          }

          hasSentences = true;
          target.append(section);
        });
      };

      createSentenceSection(
        outputDiv,
        sentences.slice(0, OB.NUMBER_OF_SENTENCES),
      );

      let needAutoplay = true;

      const [a1, a2] = autoplayDivArray;

      if (a1) {
        if (a1.querySelector('audio[data-sentence]')) {
          needAutoplay = false;
        }
      }
      if (a2) {
        needAutoplay = false;
      }

      if (needAutoplay) {
        const autoplayDiv = document.createElement('div');
        autoplayDiv.style.display = 'none';

        if (!a1 && vocabAudioEl) {
          const el1 = vocabAudioEl.clone();
          el1.audio.autoplay = true;
          autoplayDiv.append(el1.span);

          const firstSent = sentenceAudioElArray[0];
          if (firstSent) {
            const el2 = firstSent.clone();
            autoplayDiv.append(el2.span);
            el1.audio.onended = () => {
              currentlyPlayingSentence = el2.idValue;
              setSentencePlaying();
              el2.audio.play();
              el1.audio.onended = null;
            };
          }
        } else {
          const firstSent = sentenceAudioElArray[0];
          if (firstSent) {
            const el2 = firstSent.clone();
            autoplayDiv.append(el2.span);

            let isAutoplaySentence = true;
            if (a1.classList.contains(AUDIO_PLAYED)) {
              const v = a1.querySelector('audio[data-vocab]');
              if (v instanceof HTMLAudioElement) {
                if (!v.classList.contains(AUDIO_PLAYED)) {
                  isAutoplaySentence = false;
                  v.onended = () => {
                    currentlyPlayingSentence = el2.idValue;
                    setSentencePlaying();
                    el2.audio.play();
                    v.onended = null;
                  };
                }
              }
            }

            if (isAutoplaySentence) {
              currentlyPlayingSentence = el2.idValue;
              setSentencePlaying();
              el2.audio.autoplay = true;
            }
          }
        }

        autoplayDivArray.push(autoplayDiv);
        document.body.append(autoplayDiv);
      }

      if (sentences.length > OB.NUMBER_OF_SENTENCES) {
        const details = document.createElement('details');

        const summary = document.createElement('summary');
        summary.innerText = 'Additional Examples';
        details.append(summary);

        createSentenceSection(
          details,
          // Trim to 25 for performance reasons
          sentences.slice(OB.NUMBER_OF_SENTENCES).slice(0, 25),
        );
        outputDiv.append(details);
      }

      if (outputDiv.innerHTML && hasSentences) {
        return outputDiv;
      } else {
        outputDiv.remove();
      }
    });

  $.jStorage.listenKeyChange('currentItem', onNewVocabulary);
  $.jStorage.listenKeyChange('l/currentLesson', onNewVocabulary);
  $.jStorage.listenKeyChange('l/currentQuizItem', onNewVocabulary);
  onNewVocabulary();

  const onNewQuestionType = () => {
    if (document.URL.includes('/session')) {
      if (
        (document.URL.includes('/lesson/')
          ? $.jStorage.get('l/questionType')
          : $.jStorage.get('questionType')) === 'reading'
      ) {
        setTimeout(() => {
          autoRevealer.disconnect();
          autoplayDivArray.map((el) => el.remove());
          autoplayDivArray.splice(0, autoplayDivArray.length);
          sentences.splice(0, sentences.length);

          let key = 'currentItem';
          if (document.URL.includes('/lesson/session')) {
            key = $.jStorage.get('l/quizActive')
              ? 'l/currentQuizItem'
              : 'l/currentLesson';
          }

          const c =
            /** @type {import("./types/wanikani").WKCurrent<'vocabulary'>} */ (
              $.jStorage.get(key)
            );

          if (!c || !('voc' in c)) {
            return;
          }

          onNewVocabulary();
        }, 50);
      }
    }
  };

  $.jStorage.listenKeyChange('questionType', onNewQuestionType);
  $.jStorage.listenKeyChange('l/questionType', onNewQuestionType);

  const AUDIO_IDLE = 'audio-idle';
  const AUDIO_PLAY = 'audio-play';
  const AUDIO_PLAYED = 'audio-played';

  function stopAllAudio() {
    document.querySelectorAll('audio').forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    document.querySelectorAll('[data-vocab], [data-sentence]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.pointerEvents = '';
        el.classList.replace(AUDIO_PLAY, AUDIO_IDLE);
      }
    });
  }

  /**
   *
   * Create an audio play using WaniKani styling
   *
   * @typedef {ReturnType<typeof createAudioPlayer>} AudioPlayer
   *
   * @param {string} idKey
   * @param {string} idValue
   */
  function createAudioPlayer(idKey, idValue) {
    const span = document.createElement('div');
    span.setAttribute(`data-${idKey}`, idValue);
    span.className = 'audio-player';

    const button = document.createElement('button');
    button.setAttribute(`data-${idKey}`, idValue);
    button.type = 'button';
    button.className = 'audio-btn';
    button.classList.add(
      idKey === 'sentence' && idValue === currentlyPlayingSentence
        ? AUDIO_PLAY
        : AUDIO_IDLE,
    );

    button.addEventListener('click', () => {
      stopAllAudio();
      audio.play().then(() => {
        document
          .querySelectorAll(`[data-${idKey}="${idValue}"]`)
          .forEach((el) => {
            if (el instanceof HTMLElement) {
              el.classList.replace(AUDIO_IDLE, AUDIO_PLAY);
            }
          });
      });
    });

    const checkLabel = document.createElement('label');
    checkLabel.className = 'pinning';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    checkLabel.append(checkbox, document.createElement('span'));

    const audio = document.createElement('audio');
    audio.setAttribute(`data-${idKey}`, idValue);
    audio.style.display = 'none';
    audio.preload = 'none';

    /**
     *
     * @param {HTMLAudioElement} a
     */
    const setAudio = (a) => {
      a.onplay = () => {
        if (idKey === 'sentence') currentlyPlayingSentence = idValue;
      };

      a.addEventListener('ended', () => {
        audio.currentTime = 0;
        document
          .querySelectorAll(`[data-${idKey}="${idValue}"]`)
          .forEach((el) => {
            if (el instanceof HTMLElement) {
              el.classList.add(AUDIO_PLAYED);
              el.classList.replace(AUDIO_PLAY, AUDIO_IDLE);
            }
          });
        a.currentTime = 0;
      });
    };
    setAudio(audio);

    span.append(
      button,
      audio,
      checkLabel,
      (() => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'unstyled';
        btn.ariaRoleDescription = 'button';
        btn.style.cursor = 'pointer';
        btn.style.marginLeft = '0.3em';

        const checkImg = document.createElement('img');
        checkImg.width = 12;
        checkImg.src =
          'https://emoji.discourse-cdn.com/apple/heavy_minus_sign.png?v=12';
        btn.append(checkImg);

        return btn;
      })(),
    );
    const oldSpan = span;

    return {
      idKey,
      idValue,
      span,
      button,
      checkLabel,
      checkbox,
      audio,
      clone() {
        const span = /** @type {HTMLSpanElement} */ (oldSpan.cloneNode(true));
        const audio =
          span.querySelector('audio') || document.createElement('audio');

        setAudio(audio);
        return {
          idKey,
          idValue,
          span,
          audio,
        };
      },
    };
  }

  function setSentencePlaying() {
    if (!currentlyPlayingSentence) return;
    document
      .querySelectorAll(`[data-sentence="${currentlyPlayingSentence}"]`)
      .forEach((el) => {
        if (el instanceof HTMLElement) {
          el.classList.replace(AUDIO_IDLE, AUDIO_PLAY);
        }
      });
  }

  /**
   *
   * @param {ImmersionKitExample} s
   * @returns {Required<WKAutoplaySentence>}
   */
  function formatImKit(s) {
    return {
      id: s.sentence_id,
      ja: `${s.sentence} (${s.deck_name})`,
      audio: s.sound_url,
      en: s.translation,
      imKit: s,
    };
  }

  function clone(o) {
    if (o && typeof o === 'object') {
      if (Array.isArray(o)) {
        return o.map((_, i) => clone(o[i]));
      }

      return Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, clone(v)]),
      );
    }
    return o;
  }

  function lsGet(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || '{}');
    } catch (e) {
      console.error(e);
    }
  }

  function lsSet(k, o) {
    if (o) {
      localStorage.setItem(k, cleanStringify(o));
    } else {
      localStorage.removeItem(k);
    }
  }

  /**
   *
   * @param {*} o
   * @param {number} [indent]
   * @returns
   */
  function cleanStringify(o, indent) {
    return JSON.stringify(
      o,
      function (k, v) {
        if (k[0] !== '_' && typeof v !== 'function') return v;
      },
      indent,
    );
  }

  /// UTILITY FUNCTIONS

  /**
   * Fisher-Yates (aka Knuth) Shuffle
   *
   * https://stackoverflow.com/a/2450976/9023855
   *
   * @type {<T>(arr: T[]) => T[]}
   */
  function shuffleArray(src) {
    const dst = Array(src.length).fill(null);
    let currentIndex = src.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [dst[currentIndex], dst[randomIndex]] = [
        src[randomIndex],
        src[currentIndex],
      ];
    }

    return dst;
  }

  /**
   *
   * @param {*} dst
   * @param {*} src
   * @returns
   */
  function deepAssign(dst, src) {
    if (typeof src === 'undefined') return dst;
    if (typeof src === 'object') {
      if (Array.isArray(dst || []) && Array.isArray(src)) {
        dst = dst || [];
        return Array.from({ length: src.length }, (_, i) =>
          deepAssign(dst[i], src[i]),
        );
      }

      if (dst && typeof dst === 'object') {
        return Object.fromEntries(
          Object.keys(src).map((k) => [k, deepAssign(dst[k], src[k])]),
        );
      }
    }

    return src;
  }
})();
