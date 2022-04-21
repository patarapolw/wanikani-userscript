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
  var elPreview;
  var topicId = "";
  function isShiritoriId(tid) {
    return ["16404"].includes(String(tid));
  }
  var vocabMap = /* @__PURE__ */ new Map();
  var EDITOR_PREVIEW_CLASS = "d-editor-preview";
  var reJaWithRuby = (() => {
    const ja = "[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}]+";
    return new RegExp(`(${ja}|<ruby\\b[^>]*>(<rt>.*?</rt>)?${ja}.*?</ruby>)+`, "gu");
  })();
  var reTopic = /\/t\/[^/]+\/(\d+)(\/.*)?$/;
  var obs = new MutationObserver((muts) => {
    const m = reTopic.exec(location.href);
    if (!m || !isShiritoriId(m[1])) {
      elPreview = null;
      return;
    }
    topicId = m[1];
    muts.forEach((m2) => {
      for (const n of m2.addedNodes) {
        if (n instanceof HTMLElement) {
          if (!elPreview && topicId) {
            elPreview = n.querySelector(`.${EDITOR_PREVIEW_CLASS}`);
            if (elPreview) {
              fetchAll(location.origin + "/t/" + topicId).then((posts) => {
                posts.map((p) => {
                  p.cooked.split("\n").map((ln) => {
                    findAndAddJa(ln, p);
                  });
                });
              });
            }
          }
        }
      }
      for (const n of m2.removedNodes) {
        if (n instanceof HTMLElement && n.querySelector(`.${EDITOR_PREVIEW_CLASS}`)) {
          elPreview = null;
          vocabMap.clear();
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
        ...matched.sort(cmp((p) => p.post.post_number)).map((p) => {
          const container = document.createElement("p");
          container.append(Object.assign(document.createElement("a"), {
            href: "/t/" + topicId + "/" + p.post.post_number,
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
      return r.json();
    }
    logger("error", r);
    return null;
  }
  async function fetchAll(urlBase) {
    const r0 = await jsonFetch(urlBase + ".json?print=true");
    if (!r0)
      return [];
    const posts = r0.post_stream.posts;
    let page = 2;
    while (posts.length < r0.posts_count) {
      const r = await jsonFetch(urlBase + ".json?print=true&page=" + page++);
      if (!r || !r.post_stream.posts.length) {
        break;
      }
      posts.push(...r.post_stream.posts);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    return posts;
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
        el.replaceWith(rt);
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
  function cmp(cb) {
    return (t1, t2) => cb(t1) - cb(t2);
  }
})();
