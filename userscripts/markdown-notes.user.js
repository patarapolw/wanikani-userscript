// ==UserScript==
// @name         WaniKani Markdown Editor Notes (2023)
// @namespace    wanikani
// @description  Write Markdown and HTML in the notes
// @version      2.0.2
// @require      https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js
// @require      https://unpkg.com/dexie@3/dist/dexie.js
// @require      https://greasyfork.org/scripts/430565-wanikani-item-info-injector/code/WaniKani%20Item%20Info%20Injector.user.js?version=1207013
// @icon         https://www.google.com/s2/favicons?sz=64&domain=markdownguide.org
// @match        *://www.wanikani.com/*
// @match        *://preview.wanikani.com/*
// @license      MIT
// @homepage     https://greasyfork.org/en/scripts/468764-wanikani-markdown-editor-notes-2023
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/markdown-notes.user.js
// @supportURL   https://community.wanikani.com/t/userscript-markdown-editor-notes-2023/62246
// @grant        none
// ==/UserScript==

// @ts-check
/// <reference path="./types/item-info.d.ts" />
(function () {
  'use strict';

  const entryClazz = 'wk-markdown-notes';

  // @ts-ignore
  const _Dexie = /** @type {typeof import('dexie').default} */ (Dexie);
  /**
   * @typedef {{ id: number; state: any; markdown: string }} EntryMarkdown
   */

  class Database extends _Dexie {
    /** @type {import('dexie').Table<EntryMarkdown, number>} */
    markdown;

    constructor() {
      super(entryClazz);
      this.version(1).stores({
        markdown: 'id',
      });
    }
  }

  const db = new Database();

  /** @type {HTMLElement} */
  let elEditor;
  /** @type {import('@toast-ui/editor').Editor} */
  let editor;
  /** @type {WKItemInfoState} */
  let state;

  const injector = wkItemInfo
    .under('meaning,reading')
    .spoiling('nothing')
    .append('Markdown Notes', (o) => {
      if (editor) {
        save();
      }

      state = o;

      const onElLoaded = () => {
        db.markdown.get(state.id).then((entry) => {
          if (editor) {
            editor.setMarkdown(entry?.markdown || '');
            setTimeout(() => {
              editor.blur();
            });
          } else {
            /** @type {import('@toast-ui/editor').EditorOptions} */
            const opts = {
              el: elEditor,
              initialEditType: 'markdown',
              previewStyle: 'vertical',
              hideModeSwitch: true,
              linkAttributes: {
                target: '_blank',
              },
              previewHighlight: false,
              customHTMLSanitizer: (s) => {
                return s;
              },
              autofocus: false,
              initialValue: entry?.markdown,
            };

            // @ts-ignore
            editor = new toastui.Editor(opts);

            const elSave = document.createElement('button');
            elSave.type = 'button';
            elSave.className = 'fa fa-save save-button';

            elSave.onclick = () => {
              elSave.classList.add(isClickedClass);
              save();
              setTimeout(() => {
                elSave.classList.remove(isClickedClass);
              }, 100);
            };

            editor.insertToolbarItem(
              { groupIndex: -1, itemIndex: -1 },
              {
                name: 'Save',
                el: elSave,
              },
            );

            editor.on('blur', () => {
              save();
            });
          }
        });
      };

      if (!elEditor) {
        elEditor = document.createElement('div');
        elEditor.id = 'wk-markdown-editor';
        elEditor.lang = 'ja';
        elEditor.onkeydown = (ev) => {
          ev.stopImmediatePropagation();
          ev.stopPropagation();
        };
      }

      onElLoaded();

      return elEditor;
    });

  window.addEventListener('willShowNextQuestion', () => {
    injector.renew();
  });

  function save() {
    if (editor) {
      db.markdown.put(
        { id: state.id, state, markdown: editor.getMarkdown() },
        state.id,
      );

      if (!elEditor) {
        editor.destroy();
      }
    }
  }

  const isClickedClass = 'is-clicked';

  add_css(/* css */ `
    @import url("https://uicdn.toast.com/editor/latest/toastui-editor.min.css");

    .toastui-editor-defaultUI {
       /* Font list from Jisho.org */
      --md-font-family-sans-serif: "Source Han Sans", "源ノ角ゴシック", "Hiragino Sans", "HiraKakuProN-W3", "Hiragino Kaku Gothic ProN W3", "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", "Noto Sans", "Noto Sans CJK JP", "メイリオ", Meiryo, "游ゴシック", YuGothic, "ＭＳ Ｐゴシック", "MS PGothic", "ＭＳ ゴシック", "MS Gothic", sans-serif;
      --md-font-family-serif: "HiraMinProN-W3", "Hiragino Mincho ProN W3", "Hiragino Mincho ProN", "ヒラギノ明朝 ProN W3", "游明朝", YuMincho, "HG明朝E", "ＭＳ Ｐ明朝", "MS PMincho", "MS 明朝", "MS Mincho", serif;
      --md-font-family: var(--md-font-family-sans-serif);

      background-color: #fff;
    }

    .toastui-editor-defaultUI .ProseMirror,
    .toastui-editor-defaultUI .toastui-editor-md-preview * {
      font-family: var(--md-font-family);
    }

    .toastui-editor-defaultUI button.save-button {
      position: relative;
      background: transparent;
      font-size: 1em;
      bottom: 0.5em;
    }

    .toastui-editor-defaultUI button.save-button.${isClickedClass} {
      background-color: gray;
    }
  `);

  function add_css(css) {
    const style = document.createElement('style');
    style.append(document.createTextNode(css));
    document.head.append(style);
  }
})();
