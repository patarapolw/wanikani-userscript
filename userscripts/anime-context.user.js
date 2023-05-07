// ==UserScript==
// @name         Wanikani Anime Sentences
// @description  Adds example sentences from anime movies and shows for vocabulary from immersionkit.com
// @version      1.1.5
// @author       psdcon, edited by polv
// @namespace    wkanimesentences/polv

// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*

// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1166918
// @copyright    2021+, Paul Connolly
// @license      MIT; http://opensource.org/licenses/MIT
// @run-at       document-end
// @grant        none
// ==/UserScript==

/**
 * Searching works by
 * - EN: category, series title, tags, translation
 * - JA: Kanji, Kana of both kinds
 *
 * Further settings in `let state = { filterFirst: [], filterOut: [] }`
 *
 * @typedef {{
 *   author_japanese: string; // !empty string
 *   category: 'anime' | 'drama' | 'games' | 'literature' | string;
 *   channel: string; // !empty string
 *   deck_name: string; // *series title
 *   deck_name_japanese: string; // !empty string, even for Romaji titles
 *   episode: string; // !empty string
 *   id: number;
 *   image_url: string;
 *   sentence: string;
 *   sentence_id: string;
 *   sentence_with_furigana: string; // *Anki style Furigana
 *   sound_begin: string; // !empty string
 *   sound_end: string; // !empty string
 *   sound_url: string;
 *   tags: ('Comedy' | 'Manga' | 'School Life' | 'Fantasy' | 'Romance' | 'Action' | 'Super Power' | 'Drama' | 'SciFi' | 'Ecchi' | 'Daily Life' | 'High School' | 'TYPE-MOON' | 'Dystopian' | 'Female Protagonist' | 'School' | 'Adventure' | 'Supernatural' | 'Parody' | 'Netflix' | 'Slice Of Life' | 'Magic' | 'Slice of Life' | 'Game' | 'Novel' | 'Parallel World' | 'Science Fiction' | 'Dystopia' | 'Cyberpunk' | 'Isekai' | 'Slife of Life' | 'Time Travel' | 'Visual Novel' | 'A-1 Pictures' | 'Light Novel' | 'Hulu' | string)[];
 *   timestamp: string;  // !empty string
 *   translation: string;
 *   translation_word_index: number[];
 *   translation_word_list: string[];
 *   word_index: number[];
 *   word_list: string[];
 * }} ImmersionkitExample
 */

(() => {
  //--------------------------------------------------------------------------------------------------------------//
  //-----------------------------------------------INITIALIZATION-------------------------------------------------//
  //--------------------------------------------------------------------------------------------------------------//
  const wkof = window.wkof;

  const scriptId = 'anime-sentences';
  const scriptName = 'Anime Sentences';

  let state = {
    settings: {
      playbackRate: 0.75,
      showEnglish: 'onhover',
      showJapanese: 'always',
      showFurigana: 'onhover',
      sentenceLengthSort: 'asc',
      filterWaniKaniLevel: true,
    },
    filterFirst: [
      'Death Note',
      /Kino.* Journey/i,
      'anohana',
      'alchemist',
      'hunter',
      /Code Geass/i,
    ],
    filterOut: /** @type {string | RegExp} */ ([]),
    item: null, // current vocab from wkinfo
    userLevel: '', // most recent level progression
    immersionKitData: /** @type {ImmersionkitExample[]} */ ([]), // cached so sentences can be re-rendered after settings change
    sentencesEl: null, // referenced so sentences can be re-rendered after settings change
    queryString: '',
  };

  // Titles taken from https://www.immersionkit.com/information
  const animeShows = {
    0: 'Angel Beats!',
    1: 'Anohana: The Flower We Saw That Day',
    2: 'Assassination Classroom Season 1',
    3: 'Bakemonogatari',
    4: 'Boku no Hero Academia Season 1',
    5: 'Cardcaptor Sakura',
    6: 'Chobits',
    7: 'Clannad',
    8: 'Clannad After Story',
    9: 'Code Geass Season 1',
    10: 'Daily Lives of High School Boys',
    11: 'Death Note',
    12: 'Durarara!!',
    13: 'Erased',
    14: 'Fairy Tail',
    15: 'Fate Stay Night UBW Season 1',
    16: 'Fate Stay Night UBW Season 2',
    17: 'Fate Zero',
    18: 'From the New World',
    19: 'Fruits Basket Season 1',
    20: 'Fullmetal Alchemist Brotherhood',
    21: "God's Blessing on this Wonderful World!",
    22: 'Haruhi Suzumiya',
    23: 'Hunter × Hunter',
    24: 'Is The Order a Rabbit',
    25: 'K-On!',
    26: 'Kanon (2006)',
    27: 'Kill la Kill',
    28: "Kino's Journey",
    29: 'Kokoro Connect',
    30: 'Little Witch Academia',
    31: 'Mahou Shoujo Madoka Magica',
    32: "My Little Sister Can't Be This Cute",
    33: 'New Game!',
    34: 'No Game No Life',
    35: 'Noragami',
    36: 'One Week Friends',
    37: 'Psycho Pass',
    38: 'Re:Zero − Starting Life in Another World',
    39: 'Shirokuma Cafe',
    40: 'Steins Gate',
    41: 'Sword Art Online',
    42: 'Toradora!',
    43: 'Wandering Witch The Journey of Elaina',
    44: 'Your Lie in April',
  };

  const animeMovies = {
    0: 'Only Yesterday',
    1: 'The Garden of Words',
    2: 'The Girl Who Leapt Through Time',
    3: 'The World God Only Knows',
    4: 'Weathering with You',
    5: 'Wolf Children',
    6: 'Your Name',
  };

  const ghibliTitles = {
    0: 'Castle in the sky',
    1: 'From Up on Poppy Hill',
    2: 'Grave of the Fireflies',
    3: "Howl's Moving Castle",
    4: "Kiki's Delivery Service",
    5: 'My Neighbor Totoro',
    6: 'Princess Mononoke',
    7: 'Spirited Away',
    8: 'The Cat Returns',
    9: 'The Secret World of Arrietty',
    10: 'The Wind Rises',
    11: 'When Marnie Was There',
    12: 'Whisper of the Heart',
  };

  main();

  function main() {
    init(() =>
      wkItemInfo
        .forType(`vocabulary`)
        .under(`examples`)
        .notify((item) => onExamplesVisible(item)),
    );
  }

  function init(callback) {
    createStyle();

    if (wkof) {
      wkof.include('ItemData,Settings');
      wkof
        .ready('Apiv2,Settings')
        .then(loadSettings)
        .then(processLoadedSettings)
        .then(getLevel)
        .then(callback);
    } else {
      console.warn(
        `${scriptName}: You are not using Wanikani Open Framework which this script utilizes to provide the settings dialog for the script. You can still use ${scriptName} normally though`,
      );
      callback();
    }
  }

  function getLevel() {
    wkof.Apiv2.fetch_endpoint(
      'level_progressions',
      (window.unsafeWindow ?? window).options ?? analyticsOptions,
    ).then((response) => {
      state.userLevel = response.data[response.data.length - 1].data.level;
    });
  }

  function onExamplesVisible(item) {
    state.item = item; // current vocab item
    addAnimeSentences();
  }

  function addAnimeSentences() {
    let parentEl = document.createElement('div');
    parentEl.setAttribute('id', 'anime-sentences-parent');

    let header = ['Anime Sentences'];

    const settingsBtn = document.createElement('i');
    settingsBtn.setAttribute('class', 'fa fa-gear');
    settingsBtn.setAttribute(
      'style',
      'font-size: 14px; cursor: pointer; vertical-align: middle; margin-left: 10px;',
    );
    settingsBtn.onclick = openSettings;
    let sentencesEl = document.createElement('div');
    sentencesEl.innerText = 'Loading...';

    header.push(settingsBtn);
    parentEl.append(sentencesEl);
    state.sentencesEl = sentencesEl;

    if (state.item.injector) {
      if (state.item.on === 'lesson') {
        state.item.injector.appendAtTop(header, parentEl);
      } else {
        // itemPage, review
        state.item.injector.append(header, parentEl);
      }
    }

    doSearch(state.item.characters.replace('〜', '')); // for "counter" kanji
  }

  function doSearch(q) {
    state.queryString = q;
    const wkLevelFilter = state.settings.filterWaniKaniLevel
      ? state.userLevel
      : '';
    let url = `https://api.immersionkit.com/look_up_dictionary?keyword=${state.queryString}&tags=&jlpt=&wk=${wkLevelFilter}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        state.immersionKitData = data.data[0].examples;
        renderSentences();
      });
  }

  // const setCategory = new Set();
  // const setDeckName = new Set();
  // const setTags = new Set();

  function renderSentences() {
    // Called from immersionkit response, and on settings save
    let examples = state.immersionKitData;
    const exampleLenBeforeFilter = examples.length;

    // examples.map((ex) => {
    //   setCategory.add(ex.category);
    //   setDeckName.add(ex.deck_name);
    //   ex.tags.map((t) => setTags.add(t));
    // });
    // console.log(examples[0], setCategory, setDeckName, setTags);

    // Filter out excluded titles
    if (state.filterOut.length) {
      examples = examples.filter((s) => {
        for (const f of state.filterOut) {
          if (f instanceof RegExp) {
            if (f.test(s.deck_name)) return false;
          } else {
            if (s.deck_name.toLocaleLowerCase().includes(f.toLocaleLowerCase()))
              return false;
          }
        }
        return true;
      });
    }

    if (state.settings.sentenceLengthSort === 'asc') {
      examples.sort((a, b) => a.sentence.length - b.sentence.length);
    }

    // Filter selected titles first
    if (state.filterFirst.length) {
      const fn = (s) => {
        let i = 0;
        for (const f of state.filterFirst) {
          if (f instanceof RegExp) {
            if (f.test(s.deck_name)) break;
          } else {
            if (s.deck_name.toLocaleLowerCase().includes(f.toLocaleLowerCase()))
              break;
          }
          i++;
        }

        return i;
      };
      examples = examples.sort((a, b) => fn(a) - fn(b));
    }

    let showJapanese = state.settings.showJapanese;
    let showEnglish = state.settings.showEnglish;
    let showFurigana = state.settings.showFurigana;
    let playbackRate = state.settings.playbackRate;

    const sentencesEl = /** @type {HTMLDivElement} */ (state.sentencesEl);

    sentencesEl.onscroll = null;

    const ATTR_INDEX = 'data-examples-index';
    sentencesEl.removeAttribute(ATTR_INDEX);

    const ATTR_SEARCH = 'data-examples-search';
    sentencesEl.removeAttribute(ATTR_SEARCH);

    if (exampleLenBeforeFilter === 0) {
      sentencesEl.innerText = 'No sentences found.';
    } else if (examples.length === 0 && exampleLenBeforeFilter > 0) {
      // TODO show which titles have how many examples
      sentencesEl.innerText =
        'No sentences found for your selected movies & shows.';
    } else {
      sentencesEl.textContent = '';

      const filterExamples = (q) => {
        let filterIn = examples;
        const filterOut = [];

        if (q) {
          q.split(/([\p{sc=Han}\p{sc=Katakana}\p{sc=Hiragana}ー]+)/gu).map(
            (s, i) => {
              s = s.trim();
              if (!s) return;

              if (i % 2) {
                s = toHiragana(s);

                const exExact = [];
                const exRe = [];

                const re = new RegExp(
                  `${s.replace(/\p{sc=Hiragana}+/gu, (p) => {
                    return `(${Array.from(p)
                      .map((_, i) => p.substring(0, i + 1))
                      .join('|')})?`;
                  })}`,
                );
                filterIn.map((ex) => {
                  for (let t of [ex.sentence, ex.sentence_with_furigana]) {
                    t = toHiragana(t);
                    if (t.includes(s)) return exExact.push(ex);
                    if (re.test(t)) return exRe.push(ex);
                  }
                  filterOut.push(ex);
                });

                filterIn = [...exExact, ...exRe];
              } else {
                s = s.toLocaleLowerCase();

                filterIn = filterIn.filter((ex) => {
                  if (
                    [
                      ex.deck_name,
                      ex.category,
                      ...ex.tags,
                      ex.translation,
                    ].some((t) => t.toLocaleLowerCase().includes(s))
                  ) {
                    return true;
                  }
                  filterOut.push(ex);
                });
              }
            },
          );
        }

        return { filterIn, filterOut };
      };

      const displayEl = document.createElement('div');
      const x = filterExamples(state.queryString);
      examples = [...x.filterIn, ...x.filterOut];
      let subExample = examples;

      sentencesEl.append(
        new MakeHTMLElement(
          '<input class="quiz-input__input" autocomplete="off" autocapitalize="none" autocorrect="off" id="user-response" name="anime-context-filter" placeholder="Filter" type="text" enabled="true">',
        ).apply((el) => {
          const inputEl = /** @type {HTMLInputElement} */ (el);
          inputEl.value = state.queryString;

          inputEl.oninput = () => {
            subExample = filterExamples(inputEl.value.trim()).filterIn;
            displayEl.setAttribute(ATTR_INDEX, '0');
            displayEl.textContent = '';
            loadExample();
          };

          inputEl.onkeydown = (ev) => {
            if (ev.key === 'Enter') {
              const q = inputEl.value.trim();
              if (q) doSearch(q);
            }
          };
        }).el,
        displayEl,
      );
      displayEl.setAttribute(ATTR_INDEX, '0');

      const loadExample = () => {
        const idx = Number(displayEl.getAttribute(ATTR_INDEX) || '0');
        if (idx >= subExample.length) return;

        const BATCH_SIZE = 10;
        const currentExs = subExample.slice(idx, idx + BATCH_SIZE);

        displayEl.setAttribute(ATTR_INDEX, idx + BATCH_SIZE);

        for (const example of currentExs) {
          const japaneseText =
            state.settings.showFurigana === 'never'
              ? example.sentence
              : new Furigana(example.sentence_with_furigana).ReadingHtml;

          displayEl.append(
            new MakeHTMLElement('div', 'anime-example')
              .apply((a) => {
                a.onclick = function () {
                  let audio = /** @type {HTMLAudioElement} */ (
                    this.querySelector('audio')
                  );
                  if (audio.paused) {
                    displayEl.querySelectorAll('audio').forEach((a) => {
                      a.pause();
                      a.currentTime = 0;
                    });
                  }
                  audio.play();
                };
              })
              .append(
                example.image_url
                  ? new MakeHTMLElement('img').attr({ src: example.image_url })
                  : null,
                new MakeHTMLElement('div', 'anime-example-text').append(
                  new MakeHTMLElement('div', 'title')
                    .attr({ title: example.id })
                    .append(example.deck_name),
                  new MakeHTMLElement('div', 'ja').attr({ lang: 'ja' }).append(
                    new MakeHTMLElement(
                      'span',
                      showJapanese === 'onhover' ? 'show-on-hover' : '',
                      showFurigana === 'onhover' ? 'show-ruby-on-hover' : '',
                      showJapanese === 'onclick' ? 'show-on-click' : '',
                    ).innerHTML(japaneseText),
                    new MakeHTMLElement('span').append(
                      new MakeHTMLElement(
                        'button',
                        'audio-btn audio-idle fa-solid fa-volume-off',
                      ),
                    ),
                    new MakeHTMLElement('audio')
                      .attr({ src: example.sound_url })
                      .apply((el) => {
                        const a = /** @type {HTMLAudioElement} */ (el);
                        a.preload = 'none';
                        a.playbackRate = playbackRate;

                        a.onplay = () => {
                          const button = a.parentNode.querySelector('button');
                          if (!button) return;
                          button.setAttribute(
                            'class',
                            'audio-btn audio-play fa-solid fa-volume-high',
                          );
                        };
                        a.onpause = () => {
                          const button = a.parentNode.querySelector('button');
                          if (!button) return;
                          button.setAttribute(
                            'class',
                            'audio-btn audio-idle fa-solid fa-volume-off',
                          );
                        };
                      }),
                  ),
                  new MakeHTMLElement('div', 'en')
                    .attr({ lang: 'en' })
                    .append(
                      new MakeHTMLElement(
                        'span',
                        showEnglish === 'onhover' ? 'show-on-hover' : '',
                        showEnglish === 'onclick' ? 'show-on-click' : '',
                      ).append(example.translation),
                    ),
                ),
              )
              .apply((el) => {
                el.querySelectorAll('.show-on-click').forEach((a) => {
                  a.onclick = function () {
                    this.classList.toggle('show-on-click');
                  };
                });
              }).el,
          );
        }
      };

      displayEl.onscroll = ({ target }) => {
        const { clientHeight, scrollHeight, scrollTop } = target;
        if (clientHeight + scrollTop >= scrollHeight) {
          loadExample();
        }
      };
      loadExample();
    }
  }

  //--------------------------------------------------------------------------------------------------------------//
  //----------------------------------------------SETTINGS--------------------------------------------------------//
  //--------------------------------------------------------------------------------------------------------------//

  function loadSettings() {
    return wkof.Settings.load(scriptId, state.settings);
  }

  function processLoadedSettings() {
    state.settings = wkof.settings[scriptId];
  }

  function openSettings(e) {
    e.stopPropagation();
    let config = {
      script_id: scriptId,
      title: scriptName,
      on_save: updateSettings,
      content: {
        general: {
          type: 'section',
          label: 'General',
        },
        sentenceLengthSort: {
          type: 'dropdown',
          label: 'Sentence Order',
          hover_tip: '',
          content: {
            asc: 'Shortest first',
            desc: 'Longest first',
          },
          default: state.settings.sentenceLengthSort,
        },
        playbackRate: {
          type: 'number',
          label: 'Playback Speed',
          step: 0.1,
          min: 0.5,
          max: 2,
          hover_tip: 'Speed to play back audio.',
          default: state.settings.playbackRate,
        },
        showJapanese: {
          type: 'dropdown',
          label: 'Show Japanese',
          hover_tip:
            'When to show Japanese text. Hover enables transcribing a sentences first (play audio by clicking the image to avoid seeing the answer).',
          content: {
            always: 'Always',
            onhover: 'On Hover',
            onclick: 'On Click',
          },
          default: state.settings.showJapanese,
        },
        showFurigana: {
          type: 'dropdown',
          label: 'Show Furigana',
          hover_tip: 'These have been autogenerated so there may be mistakes.',
          content: {
            always: 'Always',
            onhover: 'On Hover',
            never: 'Never',
          },
          default: state.settings.showFurigana,
        },
        showEnglish: {
          type: 'dropdown',
          label: 'Show English',
          hover_tip:
            'Hover or click allows testing your understanding before seeing the answer.',
          content: {
            always: 'Always',
            onhover: 'On Hover',
            onclick: 'On Click',
          },
          default: state.settings.showEnglish,
        },
        tooltip: {
          type: 'section',
          label: 'Filters',
        },
        filterGhibli: {
          type: 'list',
          label: 'Ghibli Movies',
          multi: true,
          size: 6,
          hover_tip:
            "Select which Studio Ghibli movies you'd like to see examples from.",
          default: state.settings.filterGhibli,
          content: ghibliTitles,
        },
        filterAnimeMovies: {
          type: 'list',
          label: 'Anime Movies',
          multi: true,
          size: 6,
          hover_tip:
            "Select which anime movies you'd like to see examples from.",
          default: state.settings.filterAnimeMovies,
          content: animeMovies,
        },
        filterAnimeShows: {
          type: 'list',
          label: 'Anime Shows',
          multi: true,
          size: 6,
          hover_tip:
            "Select which anime shows you'd like to see examples from.",
          default: state.settings.filterAnimeShows,
          content: animeShows,
        },
        filterWaniKaniLevel: {
          type: 'checkbox',
          label: 'WaniKani Level',
          hover_tip:
            'Only show sentences with maximum 1 word outside of your current WaniKani level.',
          default: state.settings.filterWaniKaniLevel,
        },
        credits: {
          type: 'section',
          label: 'Powered by immersionkit.com',
        },
      },
    };
    let dialog = new wkof.Settings(config);
    dialog.open();
  }

  // Called when the user clicks the Save button on the Settings dialog.
  function updateSettings() {
    state.settings = wkof.settings[scriptId];
    renderSentences();
  }

  //--------------------------------------------------------------------------------------------------------------//
  //-----------------------------------------------STYLES---------------------------------------------------------//
  //--------------------------------------------------------------------------------------------------------------//

  function createStyle() {
    const style = document.createElement('style');
    style.setAttribute('id', 'anime-sentences-style');
    // language=CSS
    style.innerHTML = /* css */ `
            #anime-sentences-parent > div {
                display: grid;
                grid-template-rows: 1fr auto;
                max-height: 350px;
            }

            #anime-sentences-parent > div > div {
                overflow-y: scroll;
            }

            #anime-sentences-parent .fa-solid {
                border: none;
                font-size: 100%;
            }

            .anime-example {
                display: flex;
                align-items: center;
                margin-bottom: 1em;
                cursor: pointer;
            }

            .audio-btn {
                background-color: transparent;
            }

            /* Make text and background color the same to hide text */
            .anime-example-text .show-on-hover, .anime-example-text .show-on-click {
                background: #ccc;
                color: #ccc;
                text-shadow: none;
            }

            .anime-example-text .show-on-hover:hover {
                background: inherit;
                color: inherit
            }

            /* Furigana hover*/
            .anime-example-text .show-ruby-on-hover ruby rt {
                visibility: hidden;
            }

            .anime-example-text:hover .show-ruby-on-hover ruby rt {
                visibility: visible;
            }

            .anime-example .title {
                font-weight: 700;
            }

            .anime-example .ja {
                font-size: 1.3em;
            }

            .anime-example img {
                margin-right: 1em;
                width: 200px;
                height: 115px;
                object-fit: contain;
            }
        `;

    document.querySelector('head').append(style);
  }

  //--------------------------------------------------------------------------------------------------------------//
  //----------------------------------------------FURIGANA--------------------------------------------------------//
  //--------------------------------------------------------------------------------------------------------------//
  // https://raw.githubusercontent.com/helephant/Gem/master/src/Gem.Javascript/gem.furigana.js
  function Furigana(reading) {
    var segments = ParseFurigana(reading || '');

    this.Reading = getReading();
    this.Expression = getExpression();
    this.Hiragana = getHiragana();
    this.ReadingHtml = getReadingHtml();

    function getReading() {
      var reading = '';
      for (var x = 0; x < segments.length; x++) {
        reading += segments[x].Reading;
      }
      return reading.trim();
    }

    function getExpression() {
      var expression = '';
      for (var x = 0; x < segments.length; x++)
        expression += segments[x].Expression;
      return expression;
    }

    function getHiragana() {
      var hiragana = '';
      for (var x = 0; x < segments.length; x++) {
        hiragana += segments[x].Hiragana;
      }
      return hiragana;
    }

    function getReadingHtml() {
      var html = '';
      for (var x = 0; x < segments.length; x++) {
        html += segments[x].ReadingHtml;
      }
      return html;
    }
  }

  function FuriganaSegment(baseText, furigana) {
    this.Expression = baseText;
    this.Hiragana = furigana.trim();
    this.Reading = baseText + '[' + furigana + ']';
    this.ReadingHtml =
      '<ruby><rb>' + baseText + '</rb><rt>' + furigana + '</rt></ruby>';
  }

  function UndecoratedSegment(baseText) {
    this.Expression = baseText;
    this.Hiragana = baseText;
    this.Reading = baseText;
    this.ReadingHtml = baseText;
  }

  function ParseFurigana(reading) {
    var segments = [];

    var currentBase = '';
    var currentFurigana = '';
    var parsingBaseSection = true;
    var parsingHtml = false;

    var characters = reading.split('');

    while (characters.length > 0) {
      var current = characters.shift();

      if (current === '[') {
        parsingBaseSection = false;
      } else if (current === ']') {
        nextSegment();
      } else if (
        isLastCharacterInBlock(current, characters) &&
        parsingBaseSection
      ) {
        currentBase += current;
        nextSegment();
      } else if (!parsingBaseSection) currentFurigana += current;
      else currentBase += current;
    }

    nextSegment();

    function nextSegment() {
      if (currentBase) segments.push(getSegment(currentBase, currentFurigana));
      currentBase = '';
      currentFurigana = '';
      parsingBaseSection = true;
      parsingHtml = false;
    }

    function getSegment(baseText, furigana) {
      if (!furigana || furigana.trim().length === 0)
        return new UndecoratedSegment(baseText);
      return new FuriganaSegment(baseText, furigana);
    }

    function isLastCharacterInBlock(current, characters) {
      return (
        !characters.length ||
        (isKanji(current) !== isKanji(characters[0]) && characters[0] !== '[')
      );
    }

    function isKanji(character) {
      return (
        character &&
        character.charCodeAt(0) >= 0x4e00 &&
        character.charCodeAt(0) <= 0x9faf
      );
    }

    return segments;
  }

  const CP_KATA_A = 'ア'.charCodeAt(0);
  const CP_HIRA_A = 'あ'.charCodeAt(0);

  /**
   *
   * @param {string} s
   */
  function toHiragana(s) {
    return s.replace(/\p{sc=Katakana}/gu, (c) =>
      String.fromCharCode(c.charCodeAt(0) - CP_KATA_A + CP_HIRA_A),
    );
  }

  class MakeHTMLElement {
    /**
     * @type {HTMLElement}
     */
    el;

    /**
     *
     * @param {string | HTMLElement} tag
     * @param {string[]} classList
     */
    constructor(tag, ...classList) {
      if (tag instanceof HTMLElement) {
        this.el = tag;
        this.el.classList.add(...classList);
      } else if (tag[0] === '<') {
        const div = document.createElement('div');
        div.innerHTML = tag;
        this.el = div.firstChild || document.createElement('div');
      } else {
        this.el = document.createElement(tag);
      }

      const { className } = this.el;
      if (className) {
        this.el.className = className + ' ' + classList.join(' ');
      } else {
        this.el.className = classList.join(' ');
      }
    }

    /**
     *
     * @param {(el: HTMLElement) => void} fn
     * @returns
     */
    apply(fn) {
      fn(this.el);
      return this;
    }

    /**
     *
     * @param {Record<string, string>} map
     */
    attr(map) {
      Object.entries(map).map(([k, v]) => {
        this.el.setAttribute(k, v);
      });
      return this;
    }

    /**
     *
     * @param  {(MakeHTMLElement | string)[]} nodes
     */
    append(...nodes) {
      this.el.append(
        ...nodes
          .filter((n) => n)
          .map((n) => (n instanceof MakeHTMLElement ? n.el : n)),
      );
      return this;
    }

    /**
     *
     * @param  {(MakeHTMLElement | string)[]} nodes
     */
    prepend(...nodes) {
      this.el.prepend(
        ...nodes
          .filter((n) => n)
          .map((n) => (n instanceof MakeHTMLElement ? n.el : n)),
      );
      return this;
    }

    /**
     *
     * @param {string} html
     * @returns
     */
    innerHTML(html) {
      this.el.innerHTML = html;
      return this;
    }
  }
})();
