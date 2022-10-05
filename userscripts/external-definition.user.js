// ==UserScript==
// @name         WaniKani JJ External Definition
// @namespace    http://www.wanikani.com
// @version      0.12.2
// @description  Get JJ External Definition from Weblio, Kanjipedia
// @author       polv
// @author       NicoleRauch
// @match        *://www.wanikani.com/*/session*
// @match        *://www.wanikani.com/*vocabulary/*
// @match        *://www.wanikani.com/*kanji/*
// @match        *://www.wanikani.com/*radicals/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weblio.jp
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1101319
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/item-info.d.ts" />
/// <reference path="./types/gm.d.ts" />
(function () {
  'use strict';

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
    '  font-size: 2em;',
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
    $('.' + entryClazz).remove();
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
  }

  const urlParts = document.URL.split('/');
  const pageType = urlParts[urlParts.length - 2];

  switch (pageType) {
    case 'radicals': {
      // Radicals quick-fix for itemInfo injector
      waitFor('body', '.page-header__icon--radical[lang=ja]').then((span) => {
        if (span && span.innerText) {
          kanji = span.innerText.trim();
          updateInfo().then((r) => {
            const dst = document.querySelector('section.subject-section');
            if (!dst) return;

            const inserter = (title, html) => {
              if (html) {
                if (html instanceof HTMLElement) {
                  html = html.outerHTML;
                }

                const section = document.createElement('section');
                section.className = 'subject-section__subsection';

                const h2 = document.createElement('h2');
                h2.className = 'subject-section__title';
                h2.innerText = title + ' Explanation';
                section.append(h2);

                const div = document.createElement('div');
                div.className = 'subject-section__text';
                div.innerHTML = html;
                section.append(div);

                dst.append(section);
              }
            };

            inserter('Kanjipedia', kanjipediaDefinition);
            inserter('Weblio', weblioDefinition);
          });
        }
      });
      break;
    }
    case 'kanji': {
      kanji = decodeURIComponent(urlParts[urlParts.length - 1]);
      updateInfo();
      break;
    }
    case 'vocabulary': {
      vocab = fixVocab(decodeURIComponent(urlParts[urlParts.length - 1]));
      waitFor(
        'body',
        '[data-react-class="Readings/Readings"][data-react-props]',
      ).then((div) => {
        if (div) {
          const props = JSON.parse(
            div.getAttribute('data-react-props') || '{}',
          );
          if (Array.isArray(props.readings)) {
            reading = props.readings.map((r) => r.reading);
          }
        }
        updateInfo();
      });
      break;
    }
    default: {
      getCurrent();
    }
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
   * @returns {Promise<Record<string, string>>}
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
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerText = 'Click for full entry';
      a.href = full_url;

      const p = document.createElement('p');
      p.style.marginTop = '0.5em';
      p.append(a);
      output.append(p);

      if (name === 'Kanjipedia') {
        kanjipediaDefinition = output;
        kanjipediaInserter.renew();
        kanjipediaItemPageInserter.renew();
      } else {
        weblioDefinition = output;
        weblioInserter.renew();
        weblioItemPageInserter.renew();
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
            `<div style="text-align:center; font-size:2em">${r.variant}<div>`,
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
            const firstResult = /** @type {HTMLAnchorElement} */ (
              $('<div />')
                .append(
                  data.responseText.replace(regexImgSrc, replacementImgSrc),
                )
                .find('#resultKanjiList a')[0]
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
                const rawResponseNode = $('<div />').append(
                  data.responseText
                    .replace(regexImgSrc, replacementImgSrc)
                    .replace(regexTxtNormal, replacementTxtNormal)
                    .replace(regexSpaceBeforeCircledNumber, '<br/>$1'),
                );

                const readingNode = rawResponseNode.find(
                  '#kanjiLeftSection #onkunList',
                );
                // Okurigana dot removal, so that it can be read as a vocabulary with Yomichan
                readingNode.find('span').each((_, it) => {
                  const $it = $(it);
                  const text = $it.text();
                  if (text[0] === '.') {
                    $it.text(text.substring(1));
                    $it.addClass('okurigana').css('color', '#ab9b96');
                  }
                });

                const r = {
                  id: kanji,
                  url: kanjiPageURL,
                  reading: readingNode.html(),
                  definition: rawResponseNode
                    .find('#kanjiRightSection p')
                    .html(),
                  variant: (() => {
                    const vs = [
                      ...rawResponseNode.find('#kanjiOyaji'),
                      ...rawResponseNode.find('.subKanji'),
                    ].filter(
                      (n) => $(n).text() !== decodeURIComponent(kanji || ''),
                    );

                    if (!vs.length) return '';

                    const $vs = $(vs).addClass('kanji-variant');
                    $vs.find('img').removeAttr('width').css('height', '2em');

                    return $vs.html();
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

    /** @type {Record<string, string>} */
    const out = {};

    if (kanji) {
      await Promise.allSettled([
        searchKanjipedia(kanji).then((html) => (out.kanjipedia = html)),
        searchWeblio(kanji).then((html) => (out.weblio = html)),
      ]);
    } else if (vocab) {
      out.weblio = await searchWeblio(vocab);
    }

    return out;
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Triggering updates on lessons and reviews

  /**
   *
   * @param {string} from
   * @param {string} lookFor
   * @returns {Promise<HTMLElement | null>}
   */
  async function waitFor(from, lookFor) {
    const targetNode = document.querySelector(from);
    if (targetNode) {
      return new Promise((resolve) => {
        new MutationObserver(function () {
          const out = targetNode.querySelector(lookFor);
          if (out instanceof HTMLElement) {
            resolve(out);
            return;
          }
        }).observe(targetNode, { childList: true, attributes: true });
      });
    }
    return null;
  }

  const kanjipediaInserter = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .under('meaning')
    .appendAtTop('Kanjipedia Explanation', (state) => {
      if (!(kanji && kanji === state.characters)) {
        return;
      }

      return kanjipediaDefinition;
    });

  const weblioInserter = wkItemInfo
    .on('lesson,lessonQuiz,review,extraStudy')
    .under('meaning')
    .appendAtTop('Weblio Explanation', (state) => {
      if (state.type === 'vocabulary') {
        if (state.characters !== vocab) return;
      } else if (!(kanji && kanji === state.characters)) {
        return;
      }

      return weblioDefinition;
    });

  const kanjipediaItemPageInserter = wkItemInfo
    .on('itemPage')
    .forType('kanji,vocabulary')
    .under('meaning')
    .append('Kanjipedia Explanation', (state) => {
      // if (state.type === 'radical' && !kanji) {
      //   kanji = state.characters;
      //   updateInfo();
      //   return;
      // }

      if (!(kanji && kanji === state.characters)) {
        return;
      }

      return kanjipediaDefinition;
    });

  const weblioItemPageInserter = wkItemInfo
    .on('itemPage')
    .forType('kanji,vocabulary')
    .under('meaning')
    .append('Weblio Explanation', (state) => {
      if (state.type === 'vocabulary') {
        if (state.characters !== vocab) return;
      } else if (!(kanji && kanji === state.characters)) {
        return;
      }

      return weblioDefinition;
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

      if (state.on === 'lesson') {
        $('#supplement-kan-reading:visible .pure-u-1-4 > div')
          .first()
          .after(
            '<span lang="ja" class="' +
              entryClazz +
              ' ' +
              entryClazz +
              '-reading' +
              '"><h2 style="margin-top: 1.25em;">Kanjipedia</h2>' +
              kanjipediaReading +
              '</span>',
          );
      } else if (state.on === 'itemPage') {
        $('.span4')
          .removeClass('span4')
          .addClass('span3')
          .last()
          .after(
            '<div lang="ja" class="span3 ' +
              entryClazz +
              ' ' +
              entryClazz +
              '-reading' +
              '"><h3>Kanjipedia</h3>' +
              kanjipediaReading +
              '</div>',
          );
      } else {
        $('#item-info #item-info-col1 #item-info-reading:visible').after(
          '<section lang="ja" class="' +
            entryClazz +
            ' ' +
            entryClazz +
            '-reading' +
            '"><h2>Kanjipedia</h2>' +
            kanjipediaReading +
            '</section>',
        );
      }
    });
})();
