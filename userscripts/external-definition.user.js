// ==UserScript==
// @name         WaniKani JJ External Definition
// @namespace    http://www.wanikani.com
// @version      0.11.1
// @description  Get JJ External Definition from Weblio, Kanjipedia
// @author       polv
// @author       NicoleRauch
// @match        *://www.wanikani.com/*/session*
// @match        *://www.wanikani.com/*vocabulary/*
// @match        *://www.wanikani.com/*kanji/*
// @match        *://www.wanikani.com/*radical/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weblio.jp
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/gm.d.ts" />
(function () {
  'use strict';

  /** @type {number | undefined} */
  const MAX_ENTRIES = 3;
  /** @type {number | undefined} */
  const HTML_MAX_CHAR = 10000;

  const link_color = 'color: #666666;';
  const entryClazz = 'wkexternaldefinition';

  // redefine the crosslink CSS class from weblio:
  const style = document.createElement('style');
  style.innerHTML = [
    '.crosslink {',
    '  ' + link_color,
    '  text-decoration: none;}',
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
  document.getElementsByTagName('head')[0].appendChild(style);
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

  function getCurrent() {
    // First, remove any already existing entries to avoid displaying entries for other items:
    $('.' + entryClazz).remove();
    kanji = undefined;
    vocab = undefined;
    reading = [];

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
  }

  $.jStorage.listenKeyChange('currentItem', getCurrent);
  $.jStorage.listenKeyChange('l/currentLesson', getCurrent);
  $.jStorage.listenKeyChange('l/currentQuizItem', getCurrent);

  const urlParts = document.URL.split('/');
  const pageType = urlParts[urlParts.length - 2];

  switch (pageType) {
    case 'kanji': {
      kanji = urlParts[urlParts.length - 1];
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
  // Loading the information and updating the webpage
  function updateInfo() {
    const hrefColor = ' style="' + link_color + '"';

    function insertDefinition(definition, full_url, name, lessonInsertAfter) {
      const h2_style =
        pageType === 'lesson' ? ' style="margin-top: 1.25em;" ' : '';
      const newHtml =
        '<section lang="ja" class="' +
        entryClazz +
        '">' +
        '<h2' +
        h2_style +
        '>' +
        name +
        ' Explanation</h2>' +
        "<div style='margin-bottom: 0.5em;'>" +
        definition +
        '</div>' +
        '<a href="' +
        full_url +
        '"' +
        hrefColor +
        ' target="_blank">Click for full entry</a>' +
        '</section>';

      if (['kanji', 'review', 'extra_study'].includes(pageType)) {
        const noteMeaning = $('#item-info-meaning-mnemonic:visible');
        if (noteMeaning.length) {
          noteMeaning.before(newHtml);
          return;
        }
      }

      $(lessonInsertAfter + ':visible').after(newHtml);
    }

    function insertReading(kanjiInfo, full_url) {
      if (pageType === 'kanji') {
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
              kanjiInfo +
              '</div>',
          );
      }
      if (['review', 'extra_study'].includes(pageType)) {
        $('#item-info #item-info-col1 #item-info-reading:visible').after(
          '<section lang="ja" class="' +
            entryClazz +
            ' ' +
            entryClazz +
            '-reading' +
            '"><h2>Kanjipedia</h2>' +
            kanjiInfo +
            '</section>',
        );
      }
      if (pageType === 'lesson') {
        $('#supplement-kan-reading:visible .pure-u-1-4 > div')
          .first()
          .after(
            '<span lang="ja" class="' +
              entryClazz +
              ' ' +
              entryClazz +
              '-reading' +
              '"><h2 style="margin-top: 1.25em;">Kanjipedia</h2>' +
              kanjiInfo +
              '</span>',
          );
      }
    }

    /**
     *
     * @param {string} kanji
     * @returns
     */
    async function searchKanjipedia(kanji) {
      /**
       *
       * @param {EntryKanjipedia} r
       */
      const setContent = (r) => {
        insertReading(r.reading, r.url);
        insertDefinition(
          r.definition,
          r.url,
          'Kanjipedia',
          '#supplement-kan-meaning-mne',
        );

        if (r.variant) {
          r.variant = r.variant.trim();
          if (!r.variant.startsWith('<')) {
            r.variant = `<div>${r.variant}</div>`;
          }
          $('.' + entryClazz + '-reading').append(
            $('<li>').text('異体字'),
            $('<div style="text-align: center">').append(r.variant),
          );
        }
      };

      const r = await db.kanjipedia.get(kanji);
      if (r) {
        setContent(r);
        return;
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
              resolve(null);
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

                setContent(r);
                db.kanjipedia.add(r);
                resolve(r);
              },
            });
          },
        });
      });
    }

    /**
     *
     * @param {string} vocab
     * @returns
     */
    async function searchWeblio(vocab) {
      /**
       *
       * @param {EntryWeblio} r
       */
      const setContent = (r) => {
        if (!r.definitions.length) return;
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

        insertDefinition(
          vocabDefinition,
          r.url,
          'Weblio',
          pageType === 'vocabulary' ||
            pageType === 'kanji' ||
            pageType === 'radical'
            ? '#note-reading'
            : '#supplement-voc-meaning-exp',
        );
      };

      const r = await db.weblio.get(vocab);
      if (r) {
        setContent(r);
        return;
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
              resolve(null);
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
              resolve(null);
              return;
            }

            const r = {
              id: vocab,
              url: vocabPageURL,
              definitions,
            };

            setContent(r);
            db.weblio.add(r);
            resolve(r);
          },
        });
      });
    }

    if (kanji) {
      if (!document.getElementById('supplement-kan-meaning-mne')) {
        $('#meaning .mnemonic-content')
          .first()
          .prepend($('<div id="supplement-kan-meaning-mne">'));
      }
      searchKanjipedia(kanji).then((html) => {
        if (kanji) {
          return searchWeblio(kanji);
        }
      });
    }
    if (vocab) {
      if (!document.getElementById('supplement-voc-meaning-exp')) {
        $('#meaning .mnemonic-content')
          .first()
          .prepend($('<div id="supplement-voc-meaning-exp">'));
      }
      searchWeblio(vocab);
    }
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

  function triggerOnLesson(targetId) {
    const targetNode = $('#' + targetId).get(0);
    if (targetNode) {
      // mutation observer throws an error if the node is undefined
      new MutationObserver(function (mutations) {
        const currentNode = mutations[0].target;
        if (
          currentNode instanceof HTMLElement &&
          currentNode.id === targetId &&
          currentNode.style &&
          currentNode.style.display !== 'none'
        ) {
          updateInfo();
        }
      }).observe(targetNode, { attributes: true });
    }
  }

  function triggerOnReview(targetId, nodeId) {
    const targetNode = $('#' + targetId).get(0);
    if (targetNode) {
      // mutation observer throws an error if the node is undefined
      new MutationObserver(function (mutations) {
        for (let i = 0; i < mutations.length; ++i) {
          for (let j = 0; j < mutations[i].addedNodes.length; ++j) {
            const addedNode = mutations[i].addedNodes[j];
            if (
              addedNode instanceof HTMLElement &&
              addedNode.id === nodeId &&
              addedNode.style &&
              addedNode.style.display !== 'none'
            ) {
              updateInfo();
              return; // we found a node we want to update -> stop iterating
            }
          }
        }
      }).observe(targetNode, { childList: true, attributes: true });
    }
  }

  // wkItemInfo
  //   .on('lesson,lessonQuiz,review,extraStudy,itemPage')
  //   .forType('vocabulary')
  //   .under('meaning')
  //   .append('Weblio Explanation', (state) => {
  //     return undefined;
  //   });

  // wkItemInfo
  //   .on('lesson,lessonQuiz,review,extraStudy,itemPage')
  //   .forType('kanji')
  //   .under('meaning')
  //   .append('Kanjipedia Explanation', (state) => {
  //     return undefined;
  //   });

  // wkItemInfo
  //   .on('lesson,lessonQuiz,review,extraStudy,itemPage')
  //   .forType('vocabulary')
  //   .under('reading')
  //   .append('Kanjipedia', (state) => {
  //     return undefined;
  //   });

  // on review meaning page (radical, vocab and kanji, but empty when radical):
  triggerOnReview('item-info-col2', 'note-meaning');

  // on review reading page (radical, vocab and kanji, but we change the page only when kanji)
  triggerOnReview('item-info-col1', 'item-info-reading');

  // on lesson vocab meaning page:
  triggerOnLesson('supplement-voc-meaning');

  // on lesson kanji meaning page:
  triggerOnLesson('supplement-kan-meaning');

  // on lesson kanji reading page:
  triggerOnLesson('supplement-kan-reading');
})();
