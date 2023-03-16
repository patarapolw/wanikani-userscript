// ==UserScript==
// @name         WaniKani JJ External Definition
// @namespace    http://www.wanikani.com
// @version      1.0.0
// @description  Get JJ External Definition from Weblio, Kanjipedia
// @author       polv
// @author       NicoleRauch
// @match        *://www.wanikani.com/*/session
// @match        *://www.wanikani.com/*/session/*
// @match        *://preview.wanikani.com/lesson/session
// @match        *://preview.wanikani.com/subjects/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weblio.jp
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1111117
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// @homepage     https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/external-definition.user.js
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/item-info.d.ts" />
/// <reference path="./types/gm.d.ts" />
(function () {
  'use strict';

  const AFTER_EN_MEANING = false;

  /** @type {number | undefined} */
  const MAX_ENTRIES = 3;
  /** @type {number | undefined} */
  const HTML_MAX_CHAR = 10000;

  const entryClazz = 'wkexternaldefinition';

  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(/* css */ `
  .${entryClazz} details {
    margin-top: 1em;
  }

  .${entryClazz} details summary {
    display: revert;
    margin-bottom: 1em;
    cursor: pointer;
  }

  /* Weblio fixes */
  .${entryClazz} p {
    margin-bottom: 0.5em;
  }
  .${entryClazz} a.crosslink {
    color: #023e8a;
  }
  .${entryClazz} a {
    text-decoration: none;
  }
  .${entryClazz} ol {
    list-style: revert;
    padding: revert;
  }
  .${entryClazz} ul {
    list-style: revert;
    padding: revert;
  }
  .${entryClazz} .wnryjNotice {
    border: #b5b6b5 solid 1px;
    font-size: 0.8em;
    line-height: 1.32em;
    margin: 16px 0 0 0;
    padding: 10px;
    width: auto;
  }
  .${entryClazz} .SgkdjImg img {
    width: 40%;
    height: 40%;
  }
  .${entryClazz} .synonymsUnderDictWrp {
    margin-top: 1em;
  }
  .${entryClazz} .synonymsUnderDict {
    background-color: #f7f7f7;
    clear: both;
    margin: 0 0 0 8px;
    padding: 2px 8px;
  }
  .${entryClazz} .synonymsUnderDict a {
    padding-right: 1em;
  }
  .${entryClazz} .tssmjC {
    background-color: #f0f0f0;
    border: #666666 solid 1px;
    color: #363636;
    font-size: 0.9em;
    line-height: 1.0em;
    margin-right: 5px;
    padding: 1px;
  }

  /* Kanjipedia fixes */
  .${entryClazz} .kanji-variant {
    display: inline-block;
    text-align: center;
    width: 100%;
    font-size: 2em;
    font-family: serif;
    margin-top: 0;
    margin-bottom: 0;
  }
  .${entryClazz} .kanji-variant img {
    height: 2em;
  }
  .${entryClazz} .kanji-variant + .kanji-variant {
    margin-left: 1em;
  }
  .${entryClazz} .okurigana {
    color: #ab9b96;
  }
  @media only screen and (min-width: 768px) {
    .subject-readings__reading {
      flex: 1;
    }
  }
  `),
  );
  document.head.appendChild(style);

  const radicalMap = {
    Gun: ['𠂉'],
    Leaf: ['丆'],
    Beggar: ['丂'],
    Spikes: ['业'],
    Kick: ['𧘇'],
    Viking: ['𤇾', '𦥯'],
    Cape: ['𠃌'],
    Hills: [],
    Gladiator: ['龹'],
    Pope: [],
    Spring: ['𡗗'],
    Squid: ['㑒', '僉'],
    Yurt: [],
    Chinese: ['𦰩', '堇'],
    Bear: ['㠯'],
    Blackjack: ['龷'],
    Trash: ['𠫓'],
    Tofu: [],
    Creeper: [],
    Bar: ['㦮', '戔'],
    Saw: ['巩'],
    Zombie: ['袁'],
    Explosion: [],
    Morning: ['𠦝', '龺'],
    'Death Star': ['俞'],
    Comb: [],
    Elf: [],
    Coral: ['丞'],
    Cactus: [],
    Satellite: ['䍃'],
    Psychopath: ['鬯'], // Except this one; but it's a smaller radical not elsewhere described.
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // @ts-ignore
  const _Dexie = /** @type {typeof import('dexie').default} */ (Dexie);
  /**
   * @typedef {{ id: string; url: string; definition: string; reading: string; variant: string }} EntryKanjipedia
   * @typedef {{ id: string; url: string; definitions: string[] }} EntryWeblio
   */

  class Database extends _Dexie {
    /** @type {import('dexie').Table<EntryKanjipedia, string>} */
    kanjipedia;

    /** @type {import('dexie').Table<EntryWeblio, string>} */
    weblio;

    constructor() {
      super(entryClazz);
      this.version(1).stores({
        kanjipedia: 'id,url',
        weblio: 'id,url',
      });
    }
  }

  const db = new Database();

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Updating the kanji and vocab we are looking for
  /** @type {string | undefined} */
  let kanji;
  /** @type {string | undefined} */
  let vocab;

  let isSuru = false;

  let isSuffix = false;
  /** @type {string[]} */
  let reading = [];

  let kanjipediaDefinition;
  let weblioDefinition;
  let kanjipediaReading;

  function getCurrent() {
    // First, remove any already existing entries to avoid displaying entries for other items:
    document.querySelectorAll('.' + entryClazz).forEach((el) => el.remove());
    kanji = undefined;
    vocab = undefined;
    reading = [];

    kanjipediaDefinition = undefined;
    kanjipediaReading = undefined;
    weblioDefinition = undefined;

    if (typeof $ !== 'undefined' && 'jStorage' in $) {
      let key = 'currentItem';
      if (document.URL.includes('/lesson/session')) {
        // @ts-ignore
        key = $.jStorage.get('l/quizActive')
          ? 'l/currentQuizItem'
          : 'l/currentLesson';
      }

      // @ts-ignore
      const current = $.jStorage.get(key);
      if (!current) return;

      if ('voc' in current) {
        reading = current.kana || [];
        vocab = fixVocab(current.voc);
      } else if ('kan' in current && typeof current.kan === 'string') {
        kanji = current.kan;
      } else if ('rad' in current) {
        kanji = current.characters || getRadicalKanji(current.en);
      }
    } else {
      const elObj = document.querySelector(
        'script[data-quiz-queue-target="subjects"]',
      );
      if (!elObj) return;

      try {
        const obj = JSON.parse(elObj.textContent || '');
        const it = obj[0];
        if (it) {
          if (it.type === 'Vocabulary') {
            vocab = it.characters;
            reading = it.readings.map((r) => r.reading);
          } else {
            kanji = it.characters || getRadicalKanji(it.meanings[0]);
          }
        }
      } catch (e) {}
    }

    updateInfo();
  }

  let cType = '';
  let cChar = '';
  /** @type {HTMLElement | null} */
  let cEl = null;

  const obs = new MutationObserver(() => {
    if (!cEl) return;

    const elChar = cEl.querySelector(
      '.character-header__characters, #character',
    );

    const elType = cEl.querySelector('#question-type') || cEl;

    if (elChar && elType) {
      if (elType.className !== cType || elChar.innerHTML !== cChar) {
        cType = elType.className;
        cChar = elChar.innerHTML;
        getCurrent();
        return;
      }
    }

    cType = '';
    cChar = '';
  });

  setInterval(() => {
    const elQuestion = document.querySelector(
      '.character-header, #question, #main-info',
    );

    if (cEl === elQuestion) {
      return;
    }
    cEl = /** @type {HTMLElement} */ (elQuestion);

    if (elQuestion) {
      obs.observe(elQuestion, {
        childList: true,
        subtree: true,
        attributeFilter: ['id', 'class'],
      });
    } else {
      obs.disconnect();
    }
  }, 1000);

  /**
   *
   * @param {string} v
   * @returns
   */
  function fixVocab(v) {
    const suru = 'する';
    isSuru = v.endsWith(suru);
    if (isSuru) {
      v = v.substring(0, v.length - suru.length);
      reading = reading.map((r) => r.replace(new RegExp(suru + '$'), ''));
    }

    const extMark = '〜';
    isSuffix = v.startsWith(extMark);
    if (isSuffix) {
      v = v.substring(extMark.length);
    }

    return v.replace(/(.)々/g, '$1$1');
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Loading the information and updating the webpage
   *
   * @returns {Promise<void>}
   */
  async function updateInfo() {
    /**
     *
     * @param {string} definition
     * @param {string} full_url
     * @param {string} name
     * @returns {string}
     */
    function insertDefinition(definition, full_url, name) {
      const output = document.createElement('div');
      output.className = entryClazz;
      output.lang = 'ja';
      output.innerHTML = definition;

      const a = document.createElement('a');
      a.innerText = 'Click for full entry';
      a.href = full_url;

      const p = document.createElement('p');
      p.style.marginTop = '0.5em';
      p.append(a);
      output.append(p);

      output.querySelectorAll('a').forEach((a) => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      });

      if (name === 'Kanjipedia') {
        kanjipediaDefinition = output;
        kanjipediaInserter.renew();
      } else {
        weblioDefinition = output;
        weblioInserter.renew();
      }

      return output.outerHTML;
    }

    /**
     *
     * @param {string} kanji
     * @returns {Promise<string>}
     */
    async function searchKanjipedia(kanji) {
      /**
       *
       * @param {EntryKanjipedia} r
       */
      const setContent = (r) => {
        kanjipediaReading = r.reading;

        if (r.variant) {
          r.variant = r.variant.trim();
          if (!r.variant.startsWith('<')) {
            r.variant = `<div>${r.variant}</div>`;
          }

          kanjipediaReading += [
            '<li>異体字</li>',
            `<div class="kanji-variant">${r.variant}<div>`,
          ].join('\n');
        }

        kanjipediaReadingInserter.renew();

        return insertDefinition(
          r.definition
            .split('<br>')
            .map((s) => `<p>${s}</p>`)
            .join('\n'),
          r.url,
          'Kanjipedia',
        );
      };

      const r = await db.kanjipedia.get(kanji);
      if (r) {
        return setContent(r);
      }

      const kanjipediaUrlBase = 'https://www.kanjipedia.jp/';
      const regexImgSrc = /img src="/g;
      const replacementImgSrc = 'img width="16px" src="' + kanjipediaUrlBase;
      const regexTxtNormal = /class="txtNormal">/g;
      const replacementTxtNormal = '>.';
      const regexSpaceBeforeCircledNumber = / ([\u2460-\u2473])/g;

      return new Promise((resolve, reject) => {
        function onerror(e) {
          (window.unsafeWindow || window).console.error(arguments);
          reject(e);
        }

        GM_xmlhttpRequest({
          method: 'GET',
          url: kanjipediaUrlBase + 'search?k=' + kanji + '&kt=1&sk=leftHand',
          onerror,
          onload: function (data) {
            const div = document.createElement('div');
            div.innerHTML = data.responseText.replace(
              regexImgSrc,
              replacementImgSrc,
            );

            const firstResult = /** @type {HTMLAnchorElement} */ (
              div.querySelector('#resultKanjiList a')
            );
            if (!firstResult) {
              resolve('');
              return;
            }

            const rawKanjiURL = firstResult.href;
            const kanjiPageURL = kanjipediaUrlBase + rawKanjiURL.slice(25);
            GM_xmlhttpRequest({
              method: 'GET',
              url: kanjiPageURL,
              onerror,
              onload: function (data) {
                const rawResponseNode = document.createElement('div');
                rawResponseNode.innerHTML = data.responseText
                  .replace(regexImgSrc, replacementImgSrc)
                  .replace(regexTxtNormal, replacementTxtNormal)
                  .replace(regexSpaceBeforeCircledNumber, '<br/>$1');

                const readingNode = rawResponseNode.querySelector(
                  '#kanjiLeftSection #onkunList',
                );
                if (!readingNode) return;

                // Okurigana dot removal, so that it can be read as a vocabulary with Yomichan
                readingNode.querySelectorAll('span').forEach((it) => {
                  const text = it.innerText;
                  if (text[0] === '.') {
                    it.innerText = text.substring(1);
                    it.classList.add('okurigana');
                    it.style.color = '#ab9b96';
                  }
                });

                const r = {
                  id: kanji,
                  url: kanjiPageURL,
                  reading: readingNode.innerHTML,
                  definition: Array.from(
                    rawResponseNode.querySelectorAll('#kanjiRightSection p'),
                  )
                    .map((p) => p.innerHTML)
                    .join('\n'),
                  variant: (() => {
                    const vs = [
                      ...rawResponseNode.querySelectorAll('#kanjiOyaji'),
                      ...rawResponseNode.querySelectorAll('.subKanji'),
                    ].filter(
                      (n) => n.textContent !== decodeURIComponent(kanji || ''),
                    );

                    if (!vs.length) return '';

                    vs.map((v) => {
                      v.classList.add('kanji-variant');
                      v.querySelectorAll('img').forEach((img) => {
                        img.removeAttribute('width');
                        img.style.height = '2em';
                      });
                    });

                    return vs.map((v) => v.innerHTML).join('\n');
                  })(),
                };

                db.kanjipedia.add(r);
                resolve(setContent(r));
              },
            });
          },
        });
      });
    }

    /**
     *
     * @param {string} vocab
     * @returns {Promise<string>}
     */
    async function searchWeblio(vocab) {
      /**
       *
       * @param {EntryWeblio} r
       */
      const setContent = (r) => {
        if (!r.definitions.length) return '';
        const sortedDef = r.definitions
          .sort((t1, t2) => {
            /**
             *
             * @param {string} t
             * @returns {number}
             */
            const fn = (t) => {
              let isKanji = /［[音訓]］/.exec(t);
              if (kanji && isKanji) return -10;

              const m = /読み方：([\p{sc=Katakana}\p{sc=Hiragana}ー]+)/u.exec(
                t,
              );
              if (m) {
                if (reading.length && !reading.includes(m[1])) {
                  return isKanji ? 10 : 5;
                }

                if (isSuffix) {
                  if (t.includes('接尾')) return -1;
                }

                if (isSuru) {
                  if (t.includes('スル')) return -1;
                }

                return 0;
              }

              return 1000;
            };
            return fn(t1) - fn(t2);
          })
          .map((html) => {
            if (!HTML_MAX_CHAR || html.length < HTML_MAX_CHAR) {
              return html;
            }

            const div = document.createElement('div');
            div.innerHTML = html.substring(0, HTML_MAX_CHAR);

            const mark = document.createElement('mark');
            mark.style.cursor = 'pointer';
            mark.setAttribute('data-html', html);
            mark.textContent = '...';

            html = div.outerHTML.replace(
              /<\/div>$/,
              mark.outerHTML.replace(
                /^<mark /,
                '$&' +
                  'onclick="parentElement.innerHTML=getAttribute(\'data-html\')" ',
              ) + '$&',
            );
            div.remove();

            return html;
          });

        let vocabDefinition = sortedDef.splice(0, MAX_ENTRIES).join('<hr>');

        if (sortedDef.length) {
          vocabDefinition += `<details><summary>Show more</summary>${sortedDef.join(
            '<hr>',
          )}</details>`;
        }

        return insertDefinition(vocabDefinition, r.url, 'Weblio');
      };

      const r = await db.weblio.get(vocab);
      if (r) {
        return setContent(r);
      }

      const vocabPageURL = 'https://www.weblio.jp/content/' + vocab;

      return new Promise((resolve, reject) => {
        function onerror(e) {
          (window.unsafeWindow || window).console.error(arguments);
          reject(e);
        }

        GM_xmlhttpRequest({
          method: 'GET',
          url: vocabPageURL,
          onerror,
          onload: function (data) {
            if (!data.responseText) {
              resolve('');
              return;
            }

            const div = document.createElement('div');
            div.innerHTML = data.responseText;
            const definitions = Array.from(div.querySelectorAll('.kiji'))
              .flatMap((el) => {
                return Array.from(el.children).filter(
                  (el) => el instanceof HTMLDivElement,
                );
              })
              .map((el) => {
                if (el instanceof HTMLElement) {
                  if (el.querySelector('script')) return '';
                  return el.innerHTML;
                }
                return '';
              })
              .filter((s) => s);
            div.remove();

            if (!definitions.length) {
              resolve('');
              return;
            }

            const r = {
              id: vocab,
              url: vocabPageURL,
              definitions,
            };

            db.weblio.add(r);
            resolve(setContent(r));
          },
        });
      });
    }

    if (kanji) {
      await Promise.allSettled([searchKanjipedia(kanji), searchWeblio(kanji)]);
    } else if (vocab) {
      await searchWeblio(vocab);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Triggering updates on lessons and reviews

  const kanjipediaInserter = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy,itemPage')
    .forType('kanji,radical')
    .under('meaning')
    .notify((state) => {
      if (
        !(
          kanji &&
          (kanji === state.characters ||
            kanji === getRadicalKanji(state.meaning))
        )
      ) {
        return;
      }

      if (!kanjipediaDefinition) return;

      const title = 'Kanjipedia Explanation';
      if (
        AFTER_EN_MEANING ||
        state.on === 'itemPage' ||
        (state.type === 'radical' && state.on === 'lesson')
      ) {
        state.injector.append(title, kanjipediaDefinition);
      } else {
        state.injector.appendAtTop(title, kanjipediaDefinition);
      }
    });

  const weblioInserter = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy,itemPage')
    .under('meaning')
    .notify((state) => {
      let fixedCharacters = state.characters;
      if (state.type === 'vocabulary') {
        fixedCharacters = fixVocab(state.characters);
      }

      if (state.on === 'itemPage') {
        if (state.type === 'vocabulary') {
          if (vocab !== fixedCharacters) {
            reading = state.reading;
            vocab = fixedCharacters;
            updateInfo();
            return;
          }
        } else {
          const newKanji = state.characters || getRadicalKanji(state.meaning);

          if (kanji !== newKanji) {
            kanji = newKanji;
            updateInfo();
            return;
          }

          if (!kanji) return;
        }
      } else {
        if (state.type === 'vocabulary') {
          if (fixedCharacters !== vocab) return;
        } else if (!(kanji && kanji === state.characters)) {
          return;
        }
      }

      if (!weblioDefinition) return;

      const title = 'Weblio Explanation';
      if (
        AFTER_EN_MEANING ||
        state.on === 'itemPage' ||
        (state.type === 'radical' && state.on === 'lesson')
      ) {
        state.injector.append(title, weblioDefinition);
      } else {
        state.injector.appendAtTop(title, weblioDefinition);
      }
    });

  const kanjipediaReadingInserter = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy,itemPage')
    .forType('kanji')
    .under('reading')
    .notify((state) => {
      if (!(kanji && kanji === state.characters)) {
        return;
      }

      if (!kanjipediaReading) return;
      const id = [entryClazz, 'kanjipedia', 'reading'].join('--');
      document.querySelectorAll('#' + id).forEach((el) => el.remove());

      if (state.on === 'lesson') {
        const dst = document.querySelector(
          '#supplement-kan-reading .pure-u-1-4 > div',
        );

        if (dst) {
          dst.insertAdjacentHTML(
            'afterend',
            '<span id="' +
              id +
              '" lang="ja" class="' +
              entryClazz +
              ' ' +
              entryClazz +
              '-reading' +
              '"><h2 style="margin-top: 1.25em;">Kanjipedia</h2>' +
              kanjipediaReading +
              '</span>',
          );
        }
      } else if (state.on === 'itemPage') {
        const dst = document.querySelector('.subject-readings');

        if (dst) {
          const el = document.createElement('div');
          el.id = id;
          el.className = `subject-readings__reading ${entryClazz} ${entryClazz}-reading`;

          const h = document.createElement('h3');
          h.className = 'subject-readings__reading-title';
          h.innerText = 'Kanjipedia';

          const content = document.createElement('div');
          content.className = 'subject-readings__reading-items';
          content.lang = 'ja';
          content.innerHTML = kanjipediaReading;

          el.append(h, content);
          dst.append(el);
        }
      } else {
        const dst = document.querySelector(
          '#item-info #item-info-col1 #item-info-reading',
        );

        if (dst) {
          dst.insertAdjacentHTML(
            'afterend',
            '<section id="' +
              id +
              '" lang="ja" class="' +
              entryClazz +
              ' ' +
              entryClazz +
              '-reading' +
              '"><h2>Kanjipedia</h2>' +
              kanjipediaReading +
              '</section>',
          );
        }
      }
    });

  /**
   *
   * @param {string[]} meanings
   * @returns {string | undefined}
   */
  function getRadicalKanji(meanings) {
    const [en] = meanings;
    if (!en) return;
    const ks = radicalMap[en];
    if (!ks) return;
    return ks[0];
  }
})();
