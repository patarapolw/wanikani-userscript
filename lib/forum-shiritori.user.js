// ==UserScript==
// @name         WaniKani Community Shiritori Duplicate Checker
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Check if your vocabulary is a duplicate in Shiritori
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=community.wanikani.com
// @grant        none
// ==/UserScript==

(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/shared/discourse.ts
  function getWindow() {
    return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  }
  function logger(lv, ...args) {
    return getWindow().console[lv](...args);
  }

  // src/forum-shiritori.ts
  var elEditorInput;
  var topicId = "";
  function isShiritoriId(tid) {
    return ["16404"].includes(String(tid));
  }
  var vocabMap = /* @__PURE__ */ new Map();
  var EDITOR_INPUT_SELECTOR = "textarea.d-editor-input";
  var reJaStr = "[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}]+";
  var reJaWithRuby = new RegExp(`(${reJaStr}|<ruby\\b[^>]*>(<rt>.*?</rt>)?${reJaStr}.*?</ruby>)+`, "gu");
  var reNotJa = new RegExp(`(?!${reJaStr})`, "gu");
  var reTopic = /\/t\/[^/]+\/(\d+)(?:\/(\d+).*)?$/;
  var obs = new MutationObserver((muts) => {
    let oldTopicId = "";
    const newTopicId = getTopicId();
    if (!newTopicId) {
      return;
    }
    if (topicId !== newTopicId) {
      vocabMap.clear();
      oldTopicId = topicId;
      topicId = newTopicId;
    }
    muts.forEach((m) => {
      for (const n of m.addedNodes) {
        if (n instanceof HTMLElement) {
          if (!elEditorInput && topicId) {
            elEditorInput = n.querySelector(EDITOR_INPUT_SELECTOR);
            logger("info", elEditorInput);
            if (elEditorInput && (!vocabMap.size || topicId !== oldTopicId)) {
              fetchAllAndAddToJa().then(() => {
                logger("info", "Vocab list loaded");
              });
            }
          }
        }
      }
      for (const n of m.removedNodes) {
        if (n instanceof HTMLElement && n.querySelector(EDITOR_INPUT_SELECTOR)) {
          elEditorInput = null;
        }
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  var markdownIt = getWindow().require("pretty-text/engines/discourse-markdown-it");
  var oldCook = markdownIt.cook;
  markdownIt.cook = function(raw, opts) {
    let html = oldCook.bind(this)(raw, opts);
    const matched = [];
    html = html.split("\n").map((ln) => {
      const ps = findJaPost(ln);
      if (ps.length) {
        matched.push(...ps);
        return ln.replace(/(<p>|^)/, "$1<del>").replace(/(<\/p>|$)/, "</del>$1");
      }
      return ln;
    }).join("\n");
    if (matched.length) {
      html += [
        "\n<hr/>\n",
        ...matched.sort(cmp((p) => -p.post.post_number)).map((p) => {
          const container = document.createElement("p");
          container.append(Object.assign(document.createElement("a"), {
            href: "/t/x/" + topicId + "/" + p.post.post_number,
            innerText: "#" + p.post.post_number
          }), " ", Object.assign(document.createElement("a"), {
            className: "mention",
            href: "/u/" + p.post.username,
            innerText: "@" + p.post.username
          }));
          container.innerHTML += " " + p.line;
          return container.outerHTML;
        })
      ].join("\n");
    }
    return html;
  };
  async function jsonFetch(url) {
    const r = await fetch(url);
    if (r.ok) {
      const json = await r.json();
      if (!json.errors) {
        return json;
      }
    }
    logger("error", r);
    return null;
  }
  async function fetchAllAndAddToJa() {
    const m = reTopic.exec(location.href);
    if (!m)
      return;
    const urlBase = location.origin + "/t/" + m[1];
    const r0 = await jsonFetch(urlBase + "/" + m[2] + ".json");
    if (!r0)
      return;
    const posts = [];
    const addAllPosts = (ps) => {
      ps.map((p) => {
        p.cooked.split("\n").map((ln) => {
          findAndAddJa(ln, p);
        });
      });
      posts.push(...ps);
    };
    addAllPosts(r0.post_stream.posts);
    const stream = r0.post_stream.stream || [];
    const chunks = [];
    while (stream.length) {
      chunks.push(stream.splice(0, 300));
    }
    let isContinue = true;
    while (chunks.length && isContinue) {
      const rs = await Promise.all(chunks.splice(0, 10).map((ids) => jsonFetch(urlBase + "/posts.json?" + ids.map((id) => `post_ids[]=${id}`).join("&")))).then((rs2) => rs2.map((r) => {
        if (!r) {
          isContinue = false;
          return;
        }
        addAllPosts(r.post_stream.posts);
      }));
    }
    if (!isContinue) {
      logger("error", `Total posts: ${r0.posts_count} != real count: ${posts.length}, due to Rate Limit?`);
    }
  }
  function makeKanji(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("ruby").forEach((el) => {
      el.querySelectorAll("rt, rp").forEach((r) => r.remove());
      el.replaceWith(el.innerText);
    });
    return div.innerHTML;
  }
  function makeReading(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("ruby").forEach((el) => {
      const rt = el.querySelector("rt");
      if (rt) {
        el.replaceWith(rt.innerText.replace(reNotJa, ""));
      }
    });
    return div.innerHTML;
  }
  function findJa(ln) {
    const lines = [];
    for (const m of ln.matchAll(reJaWithRuby)) {
      let line = m.index !== void 0 ? ln.substring(0, m.index) + `<ins>` + m[0] + `</ins>` + ln.substring(m.index + m[0].length) : ln;
      line = line.trim().replace(/^<p>/, "").replace(/<\/p>$/, "");
      if (m[0].includes("</ruby>")) {
        lines.push({ v: makeKanji(m[0]), line }, { v: makeReading(m[0]), line });
      } else {
        lines.push({ v: m[0], line });
      }
    }
    return lines;
  }
  function findAndAddJa(ln, p) {
    var _a;
    for (const { v, line } of findJa(ln)) {
      const prev = vocabMap.get(v) || {};
      const _lines = ((_a = prev[p.id]) == null ? void 0 : _a._lines) || {};
      _lines[v] = line;
      prev[p.id] = __spreadProps(__spreadValues({}, p), { _lines });
      vocabMap.set(v, prev);
    }
  }
  function findJaPost(ln) {
    const out = [];
    findJa(ln).map(({ v }) => {
      const ps = vocabMap.get(v);
      if (ps) {
        Object.values(ps).map((post) => {
          const line = post._lines[v];
          if (line) {
            out.push({ vocab: v, line, post });
          }
        });
      }
    });
    return out;
  }
  function getTopicId() {
    const m = reTopic.exec(location.href);
    if (m && isShiritoriId(m[1])) {
      return m[1];
    }
    return "";
  }
  function cmp(cb) {
    return (t1, t2) => cb(t1) - cb(t2);
  }
})();
