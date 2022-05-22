// ==UserScript==
// @name         WaniKani Community Preprocess (EasyFurigana)
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1
// @description  New syntax for Furigana, this is roughly equivalent to furigana-markdown-it plugin
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @icon         https://furigana.info/img/apple-touch-icon.png
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const REMOVE_FRONTMATTER = true;

  //////////////////////

  const DISCOURSE_REPLY_BOX_ID = 'reply-control';
  const DISCOURSE_REPLY_AREA_CLASS = 'reply-area';

  /** @type {HTMLTextAreaElement} */
  let tText = null;

  (async function main() {
    // Greasemonkey seems to inject script before reply box is available, so we might have to wait
    let dObserverTarget = await waitFor(DISCOURSE_REPLY_BOX_ID, 1000, 30);

    let observer = new MutationObserver((muts) => {
      muts.forEach((mut) => {
        mut.addedNodes.forEach((n) => {
          setupForTextArea(n);
        });

        mut.removedNodes.forEach((n) => {
          if (
            n instanceof HTMLElement &&
            n.classList.contains(DISCOURSE_REPLY_AREA_CLASS)
          ) {
            tText = null;
          }
        });
      });
    });
    observer.observe(dObserverTarget, { childList: true, subtree: true });

    // text area might already be open
    setupForTextArea(document.querySelector('textarea.d-editor-input'));
  })();

  async function waitFor(
    elementId,
    checkInterval = 1000,
    waitCutoff = Infinity,
  ) {
    let result = null;
    while (--waitCutoff > 0 && !(result = document.getElementById(elementId)))
      await sleep(checkInterval);
    return result;
  }

  function setupForTextArea(p) {
    let isInjected = false;

    if (!(p instanceof HTMLElement)) {
      return isInjected;
    }

    p.querySelectorAll('textarea').forEach((n) => {
      tText = n;
      isInjected = true;

      tText.addEventListener('paste', (ev) => {
        const oldValue = ev.clipboardData.getData('text');
        let newValue = oldValue;

        if (REMOVE_FRONTMATTER) {
          if (newValue.startsWith('---\n')) {
            const segs = newValue.substring(4).split(/\n---\n+/);
            if (segs[1] !== undefined) {
              newValue = segs[1];
            }
          }
        }

        newValue = newValue.replace(
          /\[([^\[\]]+?)\]\{([^\{\}]+?)\}/g,
          (...m) => {
            return matchFurigana(m[1], m[2]);
          },
        );

        if (newValue !== oldValue) {
          setTimeout(() => {
            let position = -1;
            let lastIndex = -1;
            const { value } = tText;

            while ((lastIndex = value.indexOf(oldValue, lastIndex + 1)) > -1) {
              position = lastIndex;
            }

            if (position > -1) {
              tText.value =
                value.substring(0, position) +
                newValue +
                value.substring(position + oldValue.length);
              tText.dispatchEvent(
                new Event('change', { bubbles: true, cancelable: true }),
              );
            }
          });
        }
      });
    });

    return isInjected;
  }

  /**
   *
   * @param {string} body
   * @param {string} toptext
   * @returns
   */
  function matchFurigana(body, toptext) {
    /**
     *
     * @param {string} p1
     * @param {string} p2
     * @returns
     */
    function makeRuby(p1, p2) {
      if (!p2) {
        result += p1;
        return p1;
      }

      const seg = `<${p1}>{${p2}}`;
      result += seg;
      return seg;
    }

    const kanaRegex = /[\u3040-\u3096\u30a1-\u30fa\uff66-\uff9fー]/;
    const kanjiRegex = /[\u3400-\u9fafカヶ々〆0-9０-９]/;

    /**
     *
     * @param {string} body
     * @returns
     */
    function bodyToRegex(body) {
      let regexStr = '^';
      let lastType = 'other';

      const combinatorOrSeparatorGroup = '([+.]?)';
      const combinatorOrSeparator = '[+.]?';
      const combinatorOnly = '\\.?';
      const furiganaGroup = '([^+.]+)';

      for (let i = 0; i < body.length; i++) {
        const c = body.charAt(i);
        if (kanjiRegex.test(c)) {
          if (lastType === 'kanji') {
            regexStr += combinatorOrSeparatorGroup;
          } else if (lastType === 'kana') {
            regexStr += combinatorOrSeparator;
          }

          regexStr += furiganaGroup;
          lastType = 'kanji';
        } else if (kanaRegex.test(c)) {
          if (lastType == 'kanji') {
            regexStr += combinatorOrSeparator;
          }
          regexStr += c;
          lastType = 'kana';
        } else {
          if (lastType !== 'other') {
            regexStr += combinatorOnly;
          }
          lastType = 'other';
        }
      }

      if (regexStr === '') {
        return null;
      }
      return new RegExp(regexStr + '$');
    }

    let result = '';

    if (/^[=＝]/.test(toptext)) {
      return makeRuby(body, toptext.slice(1));
    }

    const bodyRegex = bodyToRegex(body);
    if (bodyRegex === null) {
      return makeRuby(body, toptext);
    }

    const match = bodyRegex.exec(toptext);
    if (match === null) {
      return makeRuby(body, toptext);
    }

    let curBodyPart = '';
    let curToptextPart = '';
    let matchIndex = 1;
    let lastType = 'other';
    for (let i = 0; i < body.length; i++) {
      const c = body.charAt(i);

      if (kanjiRegex.test(c)) {
        if (lastType === 'kana' || lastType === 'other') {
          if (curBodyPart !== '') {
            makeRuby(curBodyPart, curToptextPart);
          }
          curBodyPart = c;
          curToptextPart = match[matchIndex++];
          lastType = 'kanji';
          continue;
        }

        const connection = match[matchIndex++];
        if (connection === '+' || connection === '') {
          curBodyPart += c;
          curToptextPart += match[matchIndex++];
        } else {
          makeRuby(curBodyPart, curToptextPart);
          curBodyPart = c;
          curToptextPart = match[matchIndex++];
        }
      } else {
        if (lastType !== 'kanji') {
          curBodyPart += c;
          continue;
        }

        makeRuby(curBodyPart, curToptextPart);
        curBodyPart = c;
        curToptextPart = '';

        if (kanaRegex.test(c)) {
          lastType = 'kana';
        } else {
          lastType = 'other';
        }
      }
    }

    makeRuby(curBodyPart, curToptextPart);
    return result;
  }
})();
