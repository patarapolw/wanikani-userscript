// ==UserScript==
// @name         IME2Furigana (modified by polv)
// @namespace    ime2furigana
// @version      1.8plus
// @description  Adds furigana markup rendering to WK Community. When inputting kanji with an IME, furigana markup can be automatically added.
// @author       Sinyaven (modified by polv)
// @license      MIT-0
// @match        https://community.wanikani.com/*
// @icon         https://furigana.info/img/apple-touch-icon.png
// @grant        none
// ==/UserScript==

(async function() {
  "use strict";
  // Convert back only the generated markup of <ruby lang = 'ja-JP'>. Simple <ruby> will be ignored.
  const CONVERT_ONLY_SPECIAL_MARKUP = true;
  // IME2Furigana now has 4 modes, so reducing by one might be convenient.
  // In the future, others ways to disable IME2Furigana without switch off from dashboard, and refresh, will be considered.
  const NO_OFF_MODE = true;
  // If code block detection is buggy, turn if off and use invisible characters (from https://unicode-explorer.com/c/200B) instead.
  const CODE_BLOCK_DETECTION = true;

  // Original option - turn off for convenience.
  const ASK_BEFORE_CONVERTING_RUBY_TO_FURIGANA_MARKUP = false;

  //////////////

  const DISCOURSE_REPLY_BOX_ID = "reply-control";
  const DISCOURSE_REPLY_AREA_CLASS = "reply-area";
  const DISCOURSE_BUTTON_BAR_CLASS = "d-editor-button-bar";
  const NO_BACK_CONVERSION_CLASS_FLAG = "ruby-to-furigana-markup-disabled";
  const RUBY_TEMPLATE = "<ruby lang = 'ja-JP'>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>";
  const RUBY_SPOILER_TEMPLATE = "<ruby lang = 'ja-JP'>$1<rp>(</rp><rt><span class='spoiler'>$2</spoiler></rt><rp>)</rp></ruby>";
  const FURIGANA_REGEX = /^(?:(?![ヵヶ])[\p{sc=Katakana}\p{sc=Hiragana}])+$/u;
  const KANJI_REGEX = /([\p{sc=Han}\p{N}々〆ヵヶ]+)/u;
  // Don't parse exotic ruby tags, and don't force lang="ja-JP", if it is already specified.
  const RUBY_REGEX = new RegExp(`<ruby${
    CONVERT_ONLY_SPECIAL_MARKUP ? ` lang = (')ja-JP\\1` : `(?: lang ?= ?(['"])ja(?:-JP)?\\1)?`
  }>(?![\\u200b\\u2060])([^]+?)</ruby>`, 'g');
  const SPOILER_SQUARE_REGEX = /^\[spoiler\]([^]*?)\[\/spoiler\]$/;
  const SPOILER_CLASS_REGEX = /^<span class='spoiler'>([^]*?)<\/spoiler>$/;
  // \u200b is [Zero-width space](https://unicode-explorer.com/c/200B), and might be convenient to prevent `<>[]` conversion.
  const COOK_SEARCH_REGEX = /<(?![\s\u200b\u2060])((?:<\/?\b[^<>]*>(?!\[)|[^<>])*)>\[(?!spoiler\s*\])([^\]]*)\]/g;
  const COOK_SPOILER_SEARCH_REGEX = /<(?!\s)((?:<\/?\b[^<>]*>(?!{)|[^<>])*)>{([^}]*)}/g;

  // negative lookbehind might not be supported (e.g. Waterfox) - in that case use an insufficient regex and hope for the best
  let greaterThan_regex = null;
  try { greaterThan_regex = new RegExp("(?<!<\\/?\\b[^<>]*)>", "g"); } catch (e) { greaterThan_regex = /^>/g; }

  const MODES = ['off', 'auto', 'blur', 'manual'];

  let mode = 1;
  let furigana = "";
  let bMode = null;
  const bInsert = [];
  /** @type {HTMLTextAreaElement} */
  let tText = null;
  let isTextInit = false;
  let dBanner = null;
  let alreadyInjected = false;

  // ---STORAGE--- //

  mode = parseInt(localStorage.getItem("furiganaMode") || mode);
  addEventListener("storage", e => e.key === "furiganaMode" ? modeValueChangeHandler(parseInt(e.newValue)) : undefined);

  function modeValueChangeHandler(newValue) {
    mode = newValue;
    if (!bMode) return;

    updateButton();
    // trigger _updatePreview() by appending a space, dispatching a change event, and then removing the space
    let textValue = tText.value;
    let selectionStart = tText.selectionStart;
    let selectionEnd = tText.selectionEnd;
    let selectionDirection = tText.selectionDirection;
    tText.value += " ";
    tText.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));
    tText.value = textValue;
    tText.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
    tText.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));
  }

  function setModeValue(newValue) {
    modeValueChangeHandler(newValue);
    localStorage.setItem("furiganaMode", mode);
  }

  // ---REPLY BOX AND TEXT AREA DETECTION--- //

  let dObserverTarget = await waitFor(DISCOURSE_REPLY_BOX_ID, 1000, 30); // Greasemonkey seems to inject script before reply box is available, so we might have to wait
  let observer = new MutationObserver(m => m.forEach(handleMutation));
  observer.observe(dObserverTarget, {childList: true, subtree: true});

  addCss();

  // text area might already be open
  setupForTextArea(document.querySelector("textarea.d-editor-input"));
  addButton(document.getElementsByClassName(DISCOURSE_BUTTON_BAR_CLASS)[0]);

  function handleMutation(mutation) {
    let addedNodes = Array.from(mutation.addedNodes);
    let removedNodes = Array.from(mutation.removedNodes);
    // those forEach() are executed at most once
    addedNodes.filter(n => n.tagName === "TEXTAREA").forEach(setupForTextArea);
    addedNodes.filter(n => n.classList && n.classList.contains(DISCOURSE_BUTTON_BAR_CLASS)).forEach(addButton);
    removedNodes.filter(n => n.classList && n.classList.contains(DISCOURSE_REPLY_AREA_CLASS)).forEach(cleanup);
  }

  function setupForTextArea(textArea) {
    if (!textArea) return;
    tText = textArea;
    isTextInit = false;
    textArea.addEventListener("compositionupdate", update);
    textArea.addEventListener("compositionend", addFurigana);
    textArea.addEventListener("paste", () => {
      const from = textArea.selectionStart;

      setTimeout(() => {
        const to = textArea.selectionStart;
        let isChanged = false;
        const newText = rubyTextToFuriganaMarkup(textArea.value.substring(from, to), s => isChanged = s.isChanged);
        if (isChanged) {
          textArea.setRangeText(newText, from, to, "end");
          textArea.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));
        }
      })
    });
    textArea.addEventListener("blur", updateTextArea);
    injectIntoDiscourse();
    // Force update textarea for Kiwi Browser for Android.
    updateTextArea();
  }

  function updateTextArea() {
    if (!tText) return;
    let isChanged = false;
    const newText = rubyTextToFuriganaMarkup(tText.value, s => isChanged = s.isChanged);
    if (isChanged) {
      tText.value = newText;
      tText.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));
    }
  }

  async function waitFor(elementId, checkInterval = 1000, waitCutoff = Infinity) {
    let result = null;
    while (--waitCutoff > 0 && !(result = document.getElementById(elementId))) await sleep(checkInterval);
    return result;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---MAIN LOGIC--- //

  function rtFormat(m = mode) {
    const rtStart = m === 2 ? "{" : "[";
    const rtEnd   = m === 2 ? "}" : "]";
    return {
      rtStart,
      rtEnd,
      action: (s, f) => {
        f = f || ''
        return "<" + s + ">" + rtStart + f + rtEnd
      }
    }
  }

  function addButton(div) {
    if (!div || (bMode && bMode.parentElement === div)) return;

    if (!((bMode && bMode.parentElement === div))) {
      bMode = document.createElement("button");
      bMode.id = "ime2furigana-button";
      bMode.className = "ime2furigana-button btn no-text btn-icon ember-view";
      bMode.textContent = "F";
      bMode.addEventListener("click", cycleMode);
      div.appendChild(bMode);
    }

    addInsertButton(div, 1);
    addInsertButton(div, 2);

    if (bMode) {
      updateButton()
    }
  }

  function addInsertButton(div, m) {
    if (bInsert[m] && bInsert[m].parentElement === div) return

    bInsert[m] = document.createElement("button");
    bInsert[m].className = "ime2furigana-button btn no-text btn-icon ember-view";
    bInsert[m].innerHTML = `<span${m === 2 ? ` style="filter: blur(1px)"` : ''}>ふ</span>`;
    bInsert[m].addEventListener("click", function () {
      tText.setRangeText(
        rtFormat(m).action(tText.value.substring(tText.selectionStart, tText.selectionEnd)),
        tText.selectionStart, tText.selectionEnd, "end"
      );
    });

    let title = "Furigana";

    if (document.documentElement.lang.startsWith("ja")) {
      title = "ふりがな";
    } else if (document.documentElement.lang.startsWith("zh")) {
      title = "振假名";
    } else if (document.documentElement.lang.startsWith("ko")) {
      title = "후리가나";
    }

    bInsert[m].title = title + " " + rtFormat(m).action("漢字", "ふり")

    div.appendChild(bInsert[m]);
  }

  function cycleMode() {
    setModeValue(mode > (MODES.length - 2) ? (NO_OFF_MODE ? 1 : 0) : mode + 1);
    if (tText) tText.focus();
  }

  function updateButton() {
    if (!NO_OFF_MODE) {
      bMode.classList.toggle("active", mode);
    }
    bMode.classList.toggle("auto", mode === 1 || mode === 2);
    bMode.classList.toggle("blur", mode === 2);
    bMode.classList.toggle("manual", mode === 3);
    bMode.title = "IME2Furigana - " + MODES[mode];

    updateTextArea();
  }

  function update(event) {
    if (FURIGANA_REGEX.test(event.data)) {
      furigana = event.data;
    }
  }

  function addFurigana(event) {
    if (!mode || event.data.length === 0) return;
    furigana = mode === 3 ? '' : furigana.replace(/ｎ/g, "ん");
    let parts = event.data.split(KANJI_REGEX);
    if (parts.length === 1) return;
    let hiraganaParts = parts.map(p => Array.from(p).map(c => katakanaToHiragana(c)).join(""));
    let regex = new RegExp("^" + hiraganaParts.map((p, idx) => "(" + (idx & 1 ? ".+" : p) + ")").join("") + "$");
    let rt = furigana.match(regex);
    if (!rt) {
      parts = [event.data];
      rt = [null, furigana];
    }
    rt.shift();
    const rtFunc = rtFormat()
    let markup  = parts.map((p, idx) => idx & 1 ? rtFunc.action(p, rt[idx]) : p).join("");
    event.target.setRangeText(markup, event.target.selectionStart - event.data.length, event.target.selectionStart, "end");
  }

  function katakanaToHiragana(k) {
    let c = k.charCodeAt(0);
    return c >= 12449 && c <= 12531 ? String.fromCharCode(k.charCodeAt(0) - 96) : k;
  }

  function cleanup() {
    furigana = "";
    bMode = null;
    tText = null;
    dBanner = null;
  }

  // ---CONVERTING BACK TO FURIGANA MARKUP--- //

  function removeBanner() {
    if (dBanner) dBanner.parentElement.removeChild(dBanner);
    dBanner = null;
  }

  function checkForRubyTags() {
    if (tText.parentElement.parentElement.classList.contains(NO_BACK_CONVERSION_CLASS_FLAG)) return;
    if (!RUBY_REGEX.test(tText.value)) return removeBanner();
    if (dBanner) return;
    dBanner = document.createElement("div");
    let bConvert = document.createElement("button");
    let bCancel = document.createElement("button");
    dBanner.id = "ime2furigana-conversion-banner";
    dBanner.textContent = "Convert <ruby> to furigana markup?";
    bConvert.textContent = "\u2714";
    bCancel.textContent = "\u274C";
    dBanner.appendChild(bConvert);
    dBanner.appendChild(bCancel);
    bConvert.addEventListener("click", () => { rubyToFuriganaMarkup(); removeBanner(); });
    bCancel.addEventListener("click", () => { tText.parentElement.parentElement.classList.add(NO_BACK_CONVERSION_CLASS_FLAG); removeBanner(); });
    tText.insertAdjacentElement("beforebegin", dBanner);
  }

  function differentiateCodeBlocks(raw) {
    if (!CODE_BLOCK_DETECTION) {
      return [{ s: raw, is: null }];
    }

    let is = 'code_big'
    let parts = raw.split(/((?:^|\n)```.*\r?\n[^]*?```(?:\r?\n|$))/g).map((s, i) => ({ s, is: i & 1 ? is: null }));

    is = 'code_small'
    parts = parts.map((p) => {
      if (p.is) return [p];

      let out = [];
      let isCode = false;
      let s = '';

      const segs = p.s.split('`')
      segs.map((seg, i) => {
        s += seg;
        const prevSeg = segs[i - 1] || '';
        if (prevSeg[prevSeg.length - 1] !== '\\') {
          out.push({ s, is: isCode ? is : null });
          s = '';
          isCode = !isCode;
        }

        if (i < segs.length - 1) {
          s += '`';
        }
      })
      out.push({ s, is: isCode ? is : null });

      return out;
    }).reduce((prev, c) => [...prev, ...c])

    return parts;
  }

  function rubyToFuriganaMarkup() {
    if (!ASK_BEFORE_CONVERTING_RUBY_TO_FURIGANA_MARKUP && isTextInit) return;

    let isChanged = false;
    const newText = rubyTextToFuriganaMarkup(tText.value, s => isChanged = s.isChanged);

    if (isChanged) {
      tText.value = newText;
      tText.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));
    }

    isTextInit = true;
  }

  function rubyTextToFuriganaMarkup(txt, cb) {
    // It's valid to but `code` in <ruby>, <rt> as well, but it isn't supported by the algorithm yet.
    return differentiateCodeBlocks(txt).map((p) => {
      if (p.is) return p.s;

      let rubyDepth = 0;
      const out = [];
      let isChanged = false;

      let m;
      let lastIndex = 0;
      while (m = RUBY_REGEX.exec(p.s)) {
        out.push(p.s.substring(lastIndex, m.index));

        const [raw, _quote, content] = m;
        lastIndex = m.index + raw.length;

        // Detect nested <ruby>.
        if (/<ruby.*?>/.test(content)) {
          rubyDepth++;
        } else if (/<\/ruby>/.test(content)) {
          rubyDepth--;
        }

        // Just don't collapse anything, if there are nested <ruby> tags.
        if (!rubyDepth) {
          isChanged = true;
          out.push(rubyContentToFuriganaMarkup(content));
        } else {
          out.push(raw);
        }
      }

      out.push(p.s.substring(lastIndex));
      if (!isChanged) return p.s;

      if (isChanged && cb) {
        cb({ isChanged: true });
      }

      return out.join("");
    }).join("")
  }

  function rubyContentToFuriganaMarkup(ruby) {
    // should be able to handle both interleaved and tabular markup
    // remove <rp>...</rp> or <rp>...<rt>
    ruby = ruby.split(/<rp\s*>/).map((part, idx) => idx === 0 ? part : part.substr(part.search(/<\/rp\s*>|<rt\s*>/))).join("").replace(/<\/rp\s*>/g, "");
    // get rt content
    let rt = ruby.split(/<rt\s*>/).map(part => part.substr(0, part.concat("<rb>").search(/<rb\s*>|<\/rt\s*>/)));
    rt.shift();
    // get rb content
    let rb = ruby.split(/(?:<\/rt\s*>\s*)?<rb\s*>|<\/rt\s*>/).map(part => part.substr(0, part.concat("<rt>").search(/(?:<\/rb\s*>\s*)?<rt\s*>/))).filter(part => !/^\s*$/.test(part));
    // add furigana markup brackets to rt
    rt = rt.map(v => {
      let m

      if ((m = SPOILER_SQUARE_REGEX.exec(v))) {
        return "{" + m[1] + "}"
      }

      if ((m = SPOILER_CLASS_REGEX.exec(v))) {
        return "{" + m[1] + "}"
      }

      return "[" + v + "]"
    });
    // sanitize rb ("<" not allowed except for tags)
    rb = rb.map(v => v.replace(/<(?!\/?\b[^<>]*>)/g, "&lt;"));
    // sanitize rb (">" not allowed except for tags)
    rb = rb.map(v => v.replace(greaterThan_regex, "&gt;"));
    // sanitize rt ("]" or "}" not allowed)
    rt = rt.map(v => v[0] === "[" ? v.replace(/\](?!$)/, "&rsqb;") : v.replace(/}(?!$)/, "&rcub;"));
    // pad rt/rb to be the same length
    let result = rb.reduce((total, v, idx) => total + "<" + v + ">" + (rt[idx] || "[]"), "");
    result += rt.slice(rb.length).reduce((total, v) => total + "<>" + v, "");
    return result;
  }

  // ---COOKING RULE INJECTION--- //

  function injectIntoDiscourse() {
    if (alreadyInjected) return;
    alreadyInjected = true;
    // greasemonkey workaround: unsafeWindow + exportFunction
    let w = getWindow();
    let e = typeof exportFunction === "undefined" ? o => o : exportFunction;
    injectCustomCook(w, e);
    injectCustomSave(w, e);
  }

  function injectCustomCook(w, e) {
    let oldCook = w.require("pretty-text/engines/discourse-markdown-it").cook;
    w.require("pretty-text/engines/discourse-markdown-it").cook = e((raw, opts) => oldCook(customCook(raw), opts), w);
  }

  function injectCustomSave(w, e) {
    let oldSave = w.require("discourse/controllers/composer").default.prototype.save;
    w.require("discourse/controllers/composer").default.prototype.save = e(function(t) { tText.value = customCook(tText.value); tText.dispatchEvent(new Event("change", {bubbles: true, cancelable: true}));　oldSave.call(this, t); }, w);
  }

  function customCook(raw) {
    if (!mode) {
      removeBanner();
      return raw;
    }
    ASK_BEFORE_CONVERTING_RUBY_TO_FURIGANA_MARKUP ? checkForRubyTags() : rubyToFuriganaMarkup();

    return differentiateCodeBlocks(raw).map((p) => {
      if (p.is) return p.s;
      return p.s
        .replace(COOK_SEARCH_REGEX, RUBY_TEMPLATE)
        .replace(COOK_SPOILER_SEARCH_REGEX, RUBY_SPOILER_TEMPLATE);
    }).join("");
  }

  // ---ADD CSS--- //

  function addCss() {
    let style = document.createElement("style");
    style.textContent = "#ime2furigana-conversion-banner { transform: translateY(-0.25em); padding: 0.2em 0.6em; border-bottom: 1px solid gray; background-color: var(--tertiary-low, rgba(163, 225, 255, 0.5)); }" +
      "#ime2furigana-conversion-banner > button { background-color: transparent; border: none; }" +
      "#ime2furigana-button.active { background-color: #00000042; }" +
      "#ime2furigana-button.auto { font-style: italic; }" +
      "#ime2furigana-button.blur { filter: blur(2px); }" +
      "#ime2furigana-button.manual { text-decoration: underline dotted red 3px; }";
    document.head.appendChild(style);
  }

  function getWindow() {
    return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  }
})();
