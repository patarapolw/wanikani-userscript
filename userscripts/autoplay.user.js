// ==UserScript==
// @name         WaniKani Autoplay Sentence Audio
// @namespace    polv/wanikani
// @version      0.1.2
// @description  Autoplay audio sentences (via ImmersionKit.com), with customizability (via Anki-Connect)
// @author       polv
// @match        *://www.wanikani.com/review/session*
// @match        *://www.wanikani.com/extra_study/session*
// @match        *://www.wanikani.com/lesson/session*
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1057854
// @require      https://greasyfork.org/scripts/452285-ankiconnect/code/ankiconnect.js?version=1099556
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
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
    HIDE_SENTENCE_EN: 'remove',
    NUMBER_OF_SENTENCES: 3,
    IMMERSION_KIT: {
      priority: [],
    },
    ANKI: undefined,
  };

  // SCRIPT START

  (window.unsafeWindow || window).audioAutoplay = false;

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

        deepAssign(OB, Object.keys(vOB).length ? vOB : lsGet(KEY_OB));

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

          IMMERSION_KIT.set = (sentence_id, vocab) => {
            vocab = vocab || current?.voc;
            if (!vocab) return null;

            const s = (imLookup[vocab] || []).find(
              (s0) => s0.sentence_id === sentence_id,
            );
            if (s) {
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

  const HTML_CLASS = 'wk-autoplay-sentence';
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
    }

    .${HTML_CLASS} .audio-player {
      width: 2em;
      display: inline-block;
    }

    .${HTML_CLASS} summary {
      display: revert;
    }
    `,
    }),
  );

  /** @type {import("./types/wanikani").WKCurrent<'vocabulary'>} */
  let current;
  /** @type {WKAutoplaySentence[]} */
  const sentences = [];
  /** @type {HTMLElement[]} */
  const autoplayDivArray = [];

  let isAnkiConnect = !!OB.ANKI;

  const onNewVocabulary = async () => {
    autoplayDivArray.map((el) => el.remove());
    autoplayDivArray.splice(0, autoplayDivArray.length);

    sentences.splice(0, sentences.length);

    await new Promise((resolve) => setTimeout(resolve, 50));

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

    const qType =
      key === 'currentItem' ? $.jStorage.get('questionType') : undefined;

    if (qType) {
      if (qType === 'reading') {
        // expand item info
        setTimeout(function () {
          window.addEventListener('scroll', noscroll);
          $('#option-item-info').click();
          // Remove listener to disable scroll
          setTimeout(function () {
            window.removeEventListener('scroll', noscroll);
          }, 1000);
        }, 100);
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
                      (OPTS.HIDE_SENTENCE_JA === 'remove' ? false : s.ja) ||
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
      /**
       *
       * @param {ImmersionKitExample} s
       * @returns {Required<WKAutoplaySentence>}
       */
      const formatImKit = (s) => ({
        id: s.sentence_id,
        ja: `${s.sentence} (${s.deck_name})`,
        audio: s.sound_url,
        en: s.translation,
      });

      sentences.push(
        ...(IMMERSION_KIT.user[voc] || []).map((s) => formatImKit(s)),
      );
      const existingIds = new Set(sentences.map((s) => s.id));

      await fetch(
        `https://api.immersionkit.com/look_up_dictionary?keyword=${voc}`,
      )
        .then((r) => r.json())
        .then((r) => {
          if (!current || current.voc !== voc) return;

          const {
            data: [{ examples }],
          } = /** @type {ImmersionKitResult} */ (r);

          IMMERSION_KIT.availableDecks = [
            ...new Set([
              ...IMMERSION_KIT.availableDecks,
              ...examples.map((s) => s.deck_name),
            ]),
          ].sort();

          /** @type {{[type: string]: (typeof examples)} & {'': {[type: string]: (typeof examples)}}} */
          const sortedExamples = {};
          /** @type {typeof examples} */
          let remainingExamples = examples;

          for (const p of IMMERSION_KIT.priority) {
            sortedExamples[p] = [];
            remainingExamples = remainingExamples.filter((ex) => {
              if (ex.deck_name === p) {
                sortedExamples[p].push(ex);
                return false;
              }
              return true;
            });
          }

          sortedExamples[''] = remainingExamples.reduce((prev, c) => {
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
            .flatMap((ss) =>
              shuffleArray(ss.filter((s) => !existingIds.has(s.sentence_id))),
            )
            .map((s) => {
              sentences.push(formatImKit(s));
              return s;
            });

          appender.renew();
        });

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
          const p = document.createElement('p');
          section.append(p);

          if (s.audio) {
            const player = createAudioPlayer('sentence', s.id);
            player.audio.src = s.audio;
            sentenceAudioElArray.push(player);
            p.append(player.span);
          }

          if (s.ja && OPTS.HIDE_SENTENCE_JA !== 'remove') {
            const span = document.createElement('span');
            if (OPTS.HIDE_SENTENCE_JA) {
              span.className = HIDDEN_UNTIL_HOVER_CLASS;
            }
            span.lang = 'ja';
            span.innerHTML = s.ja;
            p.append(span);
          }

          if (s.en && OPTS.HIDE_SENTENCE_EN !== 'remove') {
            const p = document.createElement('p');
            if (OPTS.HIDE_SENTENCE_EN) {
              p.className = HIDDEN_UNTIL_HOVER_CLASS;
            }
            p.lang = 'ja';
            p.innerHTML = s.en;
            section.append(p);
          }

          hasSentences = true;
          target.append(section);
        });
      };

      createSentenceSection(
        outputDiv,
        sentences.slice(0, OPTS.NUMBER_OF_SENTENCES),
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
                    el2.audio.play();
                    v.onended = null;
                  };
                }
              }
            }

            if (isAutoplaySentence) {
              el2.audio.autoplay = true;
            }
          }
        }

        autoplayDivArray.push(autoplayDiv);
        document.body.append(autoplayDiv);
      }

      if (sentences.length > OPTS.NUMBER_OF_SENTENCES) {
        const details = document.createElement('details');

        const summary = document.createElement('summary');
        summary.innerText = 'Additional Examples';
        details.append(summary);

        createSentenceSection(
          details,
          // Trim to 25 for performance reasons
          sentences.slice(OPTS.NUMBER_OF_SENTENCES).slice(0, 25),
        );
        outputDiv.append(details);
      }

      if (outputDiv.innerHTML && hasSentences) {
        return outputDiv;
      } else {
        outputDiv.remove();
      }
    });

  $.jStorage.listenKeyChange('questionCount', onNewVocabulary);
  $.jStorage.listenKeyChange('l/currentLesson', onNewVocabulary);
  $.jStorage.listenKeyChange('l/currentQuizItem', onNewVocabulary);
  onNewVocabulary();

  const AUDIO_IDLE = 'audio-idle';
  const AUDIO_PLAY = 'audio-play';
  const AUDIO_PLAYED = 'audio-played';

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
    const span = document.createElement('span');
    span.className = 'audio-player';
    span.setAttribute(`data-${idKey}`, idValue);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'audio-btn';
    button.classList.add(AUDIO_IDLE);
    button.setAttribute(`data-${idKey}`, idValue);

    const audio = document.createElement('audio');
    audio.style.display = 'none';
    audio.preload = 'none';
    audio.setAttribute(`data-${idKey}`, idValue);

    button.addEventListener('click', () => {
      audio.play().then(() => {
        document
          .querySelectorAll(`[data-${idKey}="${idValue}"]`)
          .forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.pointerEvents = 'none';
              el.classList.replace(AUDIO_IDLE, AUDIO_PLAY);
            }
          });
      });
    });

    audio.addEventListener('ended', () => {
      document
        .querySelectorAll(`[data-${idKey}="${idValue}"]`)
        .forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = '';
            el.classList.add(AUDIO_PLAYED);
            el.classList.replace(AUDIO_PLAY, AUDIO_IDLE);
          }
        });
    });

    span.append(button, audio);

    const oldSpan = span;

    return {
      span,
      button,
      audio,
      clone() {
        const span = /** @type {HTMLSpanElement} */ (oldSpan.cloneNode(true));
        const button =
          span.querySelector('button') || document.createElement('button');
        const audio =
          span.querySelector('audio') || document.createElement('audio');
        return { span, button, audio };
      },
    };
  }

  /**
   * Fisher-Yates (aka Knuth) Shuffle
   *
   * https://stackoverflow.com/a/2450976/9023855
   *
   * @type {<T>(arr: T[]) => T[]}
   */
  function shuffleArray(array) {
    let currentIndex = array.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }

  function noscroll() {
    window.scrollTo(0, 0);
  }

  function deepAssign(dst, src) {
    if (!dst) return src;
    if (src && typeof src === 'object') {
      if (Array.isArray(dst || []) && Array.isArray(src)) {
        dst = dst || [];
        const length = Math.max(dst.length, src.length);
        return Array.from({ length }, (_, i) => deepAssign(dst[i], src[i]));
      }

      return src;
    }
    return dst;
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
})();
