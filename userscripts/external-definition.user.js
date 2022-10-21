// See https://github.com/patarapolw/WanikaniExternalDefinition

// ==UserScript==
// @name         WaniKani JJ External Definition
// @namespace    http://www.wanikani.com
// @version      0.12.8
// @description  Get JJ External Definition from Weblio, Kanjipedia
// @author       polv
// @author       NicoleRauch
// @match        *://www.wanikani.com/*/session*
// @match        *://www.wanikani.com/*vocabulary/*
// @match        *://www.wanikani.com/*kanji/*
// @match        *://www.wanikani.com/*radicals/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weblio.jp
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1102710
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// @homepage     https://github.com/patarapolw/WanikaniExternalDefinition
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
  style.innerHTML = [
    '.' + entryClazz + ' a.crosslink {',
    '  color: #023e8a;',
    '}',
    '.' + entryClazz + ' a {',
    '  text-decoration: none;',
    '}',
    '.' + entryClazz + ' .kanji-variant {',
    '  display: inline-block;',
    '  text-align: center;',
    '  width: 100%;',
    '  font-size: 2em;',
    '  font-family: serif;',
    '  margin-top: 0;',
    '  margin-bottom: 0;',
    '}',
    '.' + entryClazz + ' .kanji-variant {',
    '  font-size: 2em;',
    '}',
    '.' + entryClazz + ' .kanji-variant img {',
    '  height: 2em;',
    '}',
    '.' + entryClazz + ' .kanji-variant + .kanji-variant {',
    '  margin-left: 1em;',
    '}',
    '.' + entryClazz + ' .okurigana {',
    '  color: #ab9b96;',
    '}',
    `@media only screen and (min-width: 768px){
      .subject-readings__reading {
        flex: 1;
      }
    }`,
  ].join('\n');
  document.head.appendChild(style);
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

    let key = 'currentItem';
    if (document.URL.includes('/lesson/session')) {
      key = $.jStorage.get('l/quizActive')
        ? 'l/currentQuizItem'
        : 'l/currentLesson';
    }

    const current = $.jStorage.get(key);
    if (!current) return;

    if ('voc' in current) {
      vocab = fixVocab(current.voc);
      reading = current.kana;
    } else if ('kan' in current && typeof current.kan === 'string') {
      kanji = current.kan;
    } else if ('rad' in current) {
      kanji = current.characters;
    }

    updateInfo();
  }

  if (typeof $ !== 'undefined') {
    $.jStorage.listenKeyChange('currentItem', getCurrent);
    $.jStorage.listenKeyChange('l/currentLesson', getCurrent);
    $.jStorage.listenKeyChange('l/currentQuizItem', getCurrent);
    $.jStorage.listenKeyChange('l/startQuiz', (key) => {
      if ($.jStorage.get(key)) {
        getCurrent();
      }
    });

    getCurrent();
  }

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

        insertDefinition(
          r.definition
            .split('<br>')
            .map((s) => `<p>${s}</p>`)
            .join('\n'),
          r.url,
          'Kanjipedia',
        );

        return r.definition;
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
        const vocabDefinition = r.definitions
          .sort((t1, t2) => {
            /**
             *
             * @param {string} t
             * @returns {number}
             */
            const fn = (t) => {
              if (/［[音訓]］/.exec(t)) return kanji ? -10 : 10;

              const m = /読み方：([\p{sc=Katakana}\p{sc=Hiragana}ー]+)/u.exec(
                t,
              );
              if (m) {
                if (reading.length && !reading.includes(m[1])) return 5;

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
          .slice(0, MAX_ENTRIES)
          .map((html) => {
            const div = document.createElement('div');
            div.innerHTML = html.substring(0, HTML_MAX_CHAR);
            html = div.innerHTML;
            div.remove();
            return html;
          })
          .join('<hr>');

        insertDefinition(vocabDefinition, r.url, 'Weblio');
        return vocabDefinition;
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
    .under('meaning')
    .notify((state) => {
      if (!(kanji && kanji === state.characters)) {
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
      if (state.on === 'itemPage') {
        if (state.type === 'vocabulary') {
          if (!vocab) {
            vocab = state.characters;
            reading = state.reading;
            updateInfo();
            return;
          }
        } else {
          if (!kanji) {
            kanji = state.characters;
            updateInfo();
            return;
          }
        }
      }

      if (state.type === 'vocabulary') {
        if (state.characters !== vocab) return;
      } else if (!(kanji && kanji === state.characters)) {
        return;
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
})();
