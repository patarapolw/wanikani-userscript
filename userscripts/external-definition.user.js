// ==UserScript==
// @name         WaniKani JJ External Definition
// @namespace    http://www.wanikani.com
// @version      0.11
// @description  Get JJ External Definition from Weblio, Kanjipedia
// @author       polv
// @author       NicoleRauch
// @match        *://www.wanikani.com/*/session*
// @match        *://www.wanikani.com/*vocabulary/*
// @match        *://www.wanikani.com/*kanji/*
// @match        *://www.wanikani.com/*radical/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weblio.jp
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
/// <reference path="./types/gm.d.ts" />
(function () {
  'use strict';

  const MAX_ENTRIES = 3;
  const HTML_MAX_CHAR = 10000;

  const STORE_IN_ANKI = {
    weblio: false,
    // Just change to `: false` to disable
    kanjipedia: {
      model: 'kanji Model',
      deck: 'Yomichan::Kanji',
      fields: {
        kanji: 'Kanji',
        variants: 'Kanji_Forms',
        meaning: 'Kanji_Meaning',
        meaningInfo: 'Meaning_Info',
        examples: 'Examples',
        on: 'Reading_On',
        kun: 'Reading_Kun',
        radicals: 'Radicals',
      },
    },
  };

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

  function getOnReview() {
    const current = $.jStorage.get('currentItem');
    if (!current) return;

    if ('kan' in current && typeof current.kan === 'string') {
      kanji = current.kan;
      vocab = undefined;
      reading = [];
    }

    if ('voc' in current) {
      kanji = undefined;
      vocab = fixVocab(current.voc);
      reading = current.kana;
    }
  }

  $.jStorage.listenKeyChange('currentItem', getOnReview);

  function getOnLesson() {
    const current = $.jStorage.get('l/currentLesson');
    if (!current) return;

    if ('kan' in current && typeof current.kan === 'string') {
      kanji = current.kan;
      vocab = undefined;
      reading = [];
    }

    if ('voc' in current) {
      kanji = undefined;
      vocab = fixVocab(current.voc);
      reading = current.kana;
    }
  }

  $.jStorage.listenKeyChange('l/currentLesson', getOnLesson);

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
      updateInfo();
      break;
    }
    case 'lesson': {
      getOnLesson();
      break;
    }
    default: {
      getOnReview();
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
        (definition || 'Definition not found.') +
        '</div>' +
        '<a href="' +
        full_url +
        '"' +
        hrefColor +
        ' target="_blank">Click for full entry</a>' +
        '</section>';

      if (['kanji', 'vocabulary', 'review', 'extra_study'].includes(pageType)) {
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

    if (kanji) {
      if (!document.getElementById('supplement-kan-meaning-mne')) {
        $('#meaning .mnemonic-content')
          .first()
          .prepend($('<div id="supplement-kan-meaning-mne">'));
      }

      const kanjipediaUrlBase = 'https://www.kanjipedia.jp/';
      const regexImgSrc = /img src="/g;
      const replacementImgSrc = 'img width="16px" src="' + kanjipediaUrlBase;
      const regexTxtNormal = /class="txtNormal">/g;
      const replacementTxtNormal = '>.';
      const regexSpaceBeforeCircledNumber = / ([\u2460-\u2473])/g;
      GM_xmlhttpRequest({
        method: 'GET',
        url: kanjipediaUrlBase + 'search?k=' + kanji + '&kt=1&sk=leftHand',
        onload: function (data) {
          const firstResult = /** @type {HTMLAnchorElement} */ (
            $('<div />')
              .append(data.responseText.replace(regexImgSrc, replacementImgSrc))
              .find('#resultKanjiList a')[0]
          );
          if (!firstResult) return;

          const rawKanjiURL = firstResult.href;
          const kanjiPageURL = kanjipediaUrlBase + rawKanjiURL.slice(25);
          GM_xmlhttpRequest({
            method: 'GET',
            url: kanjiPageURL,
            onload: function (data) {
              // First, remove any already existing entries to avoid displaying entries for other items:
              $('.' + entryClazz).remove();

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

              insertReading(readingNode.html(), kanjiPageURL);

              const htmlDefinition = rawResponseNode
                .find('#kanjiRightSection p')
                .html();
              insertDefinition(
                htmlDefinition,
                kanjiPageURL,
                'Kanjipedia',
                '#supplement-kan-meaning-mne',
              );

              const htmlVariant = (() => {
                const vs = [
                  ...rawResponseNode.find('#kanjiOyaji'),
                  ...rawResponseNode.find('.subKanji'),
                ].filter(
                  (n) => $(n).text() !== decodeURIComponent(kanji || ''),
                );

                if (!vs.length) return '';

                const $vs = $(vs);
                $vs.find('img').removeAttr('width').css('height', '2em');

                $('.' + entryClazz + '-reading').append(
                  $('<li>').text('異体字'),
                  $('<div style="text-align: center">').append(
                    ...$vs.addClass('kanji-variant'),
                  ),
                );

                return $vs.html();
              })();

              if (STORE_IN_ANKI.kanjipedia) {
                const ankiOpts = STORE_IN_ANKI.kanjipedia;
                const k = decodeURIComponent(kanji || '');
                if (!k) return;

                AnkiConnect('findNotes', {
                  query: `"note:${ankiOpts.model}" "${ankiOpts.fields.kanji}:${k}"`,
                })
                  .then((notes) => AnkiConnect('notesInfo', { notes }))
                  .then(([n]) => {
                    const note = {
                      id: '',
                      fields: /** @type {Record<string, string>} */ ({}),
                      tags: ['wanikani', 'kanjipedia'],
                      options: {
                        allowDuplicate: false,
                      },
                    };

                    if (n) {
                      note.id = n.noteId;

                      if (
                        $(n.fields[ankiOpts.fields.meaning].value).hasClass(
                          'kanjipedia',
                        )
                      ) {
                        return;
                      }

                      if (!n.fields[ankiOpts.fields.meaningInfo].value) {
                        note.fields[ankiOpts.fields.meaningInfo] =
                          n.fields[ankiOpts.fields.meaning].value;
                      }
                    }

                    note.fields[ankiOpts.fields.variants] = htmlVariant;
                    note.fields[
                      ankiOpts.fields.meaning
                    ] = `<div class="kanjipedia">${htmlDefinition}</div>`;
                    note.fields[ankiOpts.fields.on] = readingNode
                      .find('img[alt="音"]')
                      .siblings('.onkunYomi')
                      .html();
                    note.fields[ankiOpts.fields.kun] = readingNode
                      .find('img[alt="訓"]')
                      .siblings('.onkunYomi')
                      .html();

                    return note;
                  })
                  .then((note) => {
                    if (!note) return;

                    if (note.id) {
                      return AnkiConnect('updateNoteFields', { note });
                    }

                    note.fields[ankiOpts.fields.kanji] = k;

                    return AnkiConnect('addNote', {
                      note: {
                        ...note,
                        deckName: ankiOpts.deck,
                        modelName: ankiOpts.model,
                      },
                    });
                  });
              }
            },
          });
        },
      });
    }
    if (vocab) {
      if (!document.getElementById('supplement-voc-meaning-exp')) {
        $('#meaning .mnemonic-content')
          .first()
          .prepend($('<div id="supplement-voc-meaning-exp">'));
      }

      const vocabPageURL = 'https://www.weblio.jp/content/' + vocab;
      GM_xmlhttpRequest({
        method: 'GET',
        url: vocabPageURL,
        onload: function (data) {
          // First, remove any already existing entries to avoid displaying entries for other items:
          $('.' + entryClazz).remove();

          const div = document.createElement('div');
          div.innerHTML = data.responseText;

          const vocabDefinition = Array.from(div.querySelectorAll('.kiji'))
            .flatMap((el) => {
              return Array.from(el.children).filter(
                (el) => el instanceof HTMLDivElement,
              );
            })
            .map((el) => {
              if (el instanceof HTMLElement) {
                if (el.querySelector('script')) return '';
                el.innerHTML = el.innerHTML.substring(0, HTML_MAX_CHAR);
                return el.innerHTML;
              }
              return '';
            })
            .filter((s) => s)
            .sort((t1, t2) => {
              /**
               *
               * @param {string} t
               * @returns {number}
               */
              const fn = (t) => {
                if (/［[音訓]］/.exec(t)) return 10;

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
            .join('<hr>');

          insertDefinition(
            vocabDefinition,
            vocabPageURL,
            'Weblio',
            '#supplement-voc-meaning-exp',
          );

          div.remove();
        },
      });
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Triggering updates on lessons and reviews

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

  // on review meaning page (vocab and kanji):
  triggerOnReview('item-info-col2', 'note-meaning');

  // on review reading page (vocab and kanji, but we change the page only when kanji)
  triggerOnReview('item-info-col1', 'item-info-reading');

  // on lesson vocab meaning page:
  triggerOnLesson('supplement-voc-meaning');

  // on lesson kanji meaning page:
  triggerOnLesson('supplement-kan-meaning');

  // on lesson kanji reading page:
  triggerOnLesson('supplement-kan-reading');

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
})();
