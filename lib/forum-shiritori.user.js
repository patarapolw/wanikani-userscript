// ==UserScript==
// @name         WaniKani Community Shiritori Duplicate Checker
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Check if the vocabulary you are replying with is a duplicate
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

  // src/forum-shiritori.ts
  var elPreview;
  var vocabMap = /* @__PURE__ */ new Map();
  var EDITOR_PREVIEW_CLASS = "d-editor-preview";
  var reJaWithRuby = (() => {
    const ja = "[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}]+";
    return new RegExp(`(${ja}|<ruby\\b[^>]*>(<rt>.*?</rt>)?${ja}.*?</ruby>)+`, "gu");
  })();
  var reTopic = /\/t\/[^/]+\/(\d+)(\/.*)?$/;
  var obs = new MutationObserver((muts) => {
    const m = reTopic.exec(location.href);
    if (!m || !["16404"].includes(m[1])) {
      elPreview = null;
      return;
    }
    muts.forEach((m2) => {
      for (const n of m2.addedNodes) {
        if (n instanceof HTMLElement) {
          if (!elPreview) {
            elPreview = n.querySelector(`.${EDITOR_PREVIEW_CLASS}`);
            if (elPreview) {
              fetchAll(location.href.replace(reTopic, "/t/$1")).then((posts) => {
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
          const a = document.createElement("a");
          a.className = "mention";
          a.href = "/u/" + p.post.username;
          a.innerText = "@" + p.post.username;
          return a.outerHTML + " " + p.line;
        })
      ].join("\n");
    }
    return html;
  };
  async function jsonFetch(url, params) {
    if (params) {
      const u = new URL(url);
      Object.entries(params).map(([k, v]) => {
        u.searchParams.set(k, v);
      });
    }
    const r = await fetch(url);
    if (r.ok) {
      return r.json();
    }
    return null;
  }
  async function fetchAll(urlBase) {
    const vocabList = await jsonFetch(urlBase + ".json");
    if (!vocabList)
      return [];
    const stream = vocabList.post_stream.stream || [];
    const chunks = [];
    while (stream.length) {
      chunks.push(stream.splice(0, 300));
    }
    const posts = [];
    while (chunks.length) {
      const rs = await Promise.all(chunks.splice(0, 10).map((ids) => jsonFetch(urlBase + "/posts.json", {
        "post_ids[]": ids.join(",")
      }))).then((rs2) => rs2.map((r) => r ? r.post_stream.posts : []));
      rs.map((r) => {
        posts.push(...r);
      });
      if (chunks.length) {
        await new Promise((r) => setTimeout(r, 1e3));
      }
    }
    posts.push(...vocabList.post_stream.posts);
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
      const line = m.index !== void 0 ? ln.substring(0, m.index) + `<ins>` + m[0] + `</ins>` + ln.substring(m.index + m[0].length) : ln;
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
