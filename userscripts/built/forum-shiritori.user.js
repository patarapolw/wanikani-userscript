// ==UserScript==
// @name         WaniKani Community Shiritori Duplicate Checker
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.5
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

  // src/shared/userscript.ts
  var UserScriptWindow = class {
    get window() {
      return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    }
    get exportFunction() {
      return typeof exportFunction === "undefined" ? (o) => o : exportFunction;
    }
    get console() {
      return this.window.console;
    }
  };

  // src/shared/discourse.ts
  var DiscourseWindow = class extends UserScriptWindow {
    get window() {
      return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    }
    get exportFunction() {
      return typeof exportFunction === "undefined" ? (o) => o : exportFunction;
    }
    require(m) {
      return this.window.require(m);
    }
  };
  var w = new DiscourseWindow();

  // src/forum-shiritori.ts
  var SHIRITORI_IDS = ["16404"];
  var WARN_ENDING_N = "<b>You lost.</b> Shiritori is lost with \u3093.";
  function doCleanPostCook(p) {
    let readStartsAt = 0;
    const is16404op = p.post_number === 1 && p.topic_id === 16404;
    if (!readStartsAt) {
      if (is16404op) {
        readStartsAt = p.cooked.split("\n").findIndex((ln) => ln.includes("continue where we left off")) + 1;
      }
    }
    if (readStartsAt) {
      return p.cooked.split("\n").slice(readStartsAt).join("\n");
    }
    return p.cooked;
  }
  var topicId = "";
  function isShiritoriId(tid) {
    return SHIRITORI_IDS.includes(String(tid));
  }
  var vocabMap = /* @__PURE__ */ new Map();
  var SEL_EDITOR_INPUT = "textarea.d-editor-input";
  var SEL_POPUP = ".composer-popup";
  var elEditorInput;
  var reJaStr = "[\\p{sc=Han}\\p{sc=Katakana}\\p{sc=Hiragana}\u30FC]+";
  var reJaWithRuby = new RegExp(`(${reJaStr}|<ruby\\b[^>]*>.*?(<rt>.*?</rt>)?.*?</ruby>)+`, "gu");
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
            elEditorInput = n.querySelector(SEL_EDITOR_INPUT);
            if (elEditorInput && (!vocabMap.size || topicId !== oldTopicId)) {
              fetchAllAndAddToJa().then(() => {
                w.console.info("Vocab list loaded");
              });
            }
          }
          const SEL = "article[data-post-id]";
          const postEls = [...n.querySelectorAll(SEL)];
          if (n.matches(SEL)) {
            postEls.push(n);
          }
          postEls.map((tp) => {
            var _a, _b;
            if (tp instanceof HTMLElement) {
              const id = Number(tp.getAttribute("data-post-id"));
              const username = (_a = tp.querySelector("a[data-user-card]")) == null ? void 0 : _a.textContent;
              const topic_id = Number(topicId);
              const post_number = Number(tp.id.split("_", 2)[1]);
              const cooked = (_b = tp.querySelector(".cooked")) == null ? void 0 : _b.innerHTML;
              if (id && username && topic_id && post_number && cooked) {
                const p = {
                  id,
                  username,
                  topic_id,
                  post_number,
                  cooked
                };
                doCleanPostCook(p).split("\n").map((ln) => {
                  findAndAddJa(ln, p);
                });
              }
            }
          });
        }
      }
      for (const n of m.removedNodes) {
        if (n instanceof HTMLElement && n.querySelector(SEL_EDITOR_INPUT)) {
          elEditorInput = null;
        }
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  var markdownIt = w.require("pretty-text/engines/discourse-markdown-it");
  var oldCook = markdownIt.cook;
  markdownIt.cook = function(raw, opts) {
    let html = oldCook.bind(this)(raw, opts);
    if (!elEditorInput) {
      return html;
    }
    let editPostNumber = 0;
    let elReplyControl = elEditorInput.parentElement;
    while (elReplyControl && !elReplyControl.matches("#reply-control")) {
      elReplyControl = elReplyControl.parentElement;
    }
    if (elReplyControl) {
      const elEditing = elReplyControl.querySelector("a.post-link");
      if (elEditing && elEditing instanceof HTMLAnchorElement) {
        editPostNumber = Number(elEditing.href.split("/").pop());
      }
    }
    let matched = [];
    let isN = false;
    html = html.split("\n").map((ln) => {
      const ps = findJaPost(ln);
      if (editPostNumber) {
        ps.posts = ps.posts.filter((p) => p.post.post_number !== editPostNumber);
      }
      let isWrong = false;
      if (ps.posts.length) {
        matched.push(...ps.posts);
        isWrong = true;
      }
      if (WARN_ENDING_N && ps.vocabs.some((v) => v.endsWith("\u3093"))) {
        isN = true;
        isWrong = true;
      }
      if (isWrong) {
        return ln.replace(/(<p>|^)/, "$1<del>").replace(/(<\/p>|$)/, "</del>$1");
      }
      return ln;
    }).join("\n");
    if (isN || matched.length) {
      html += "\n<hr/>\n";
    }
    if (isN) {
      const container = document.createElement("p");
      container.innerHTML = WARN_ENDING_N;
      html += container.outerHTML;
    }
    if (matched.length) {
      html += [
        ...distinctBy(matched, (p) => p.post.post_number).sort(cmp((p) => -p.post.post_number)).map((p) => {
          const container = document.createElement("p");
          container.append(Object.assign(document.createElement("a"), {
            href: "/t/x/" + topicId + "/" + p.post.post_number,
            innerText: "#" + p.post.post_number
          }), " ", Object.assign(document.createElement("a"), {
            className: "mention",
            href: "/u/" + p.post.username,
            innerText: "@" + p.post.username
          }));
          container.innerHTML += " " + p.line.map((s, i) => i % 2 ? "<ins>" + s + "</ins>" : s).join("").replace(/^<p>/, "").replace(/<\/p>$/, "");
          return container.outerHTML;
        })
      ].join("\n");
      setTimeout(() => {
        document.querySelectorAll(SEL_POPUP).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = "none";
          }
        });
      });
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
    w.console.error(r);
    return null;
  }
  async function fetchAllAndAddToJa() {
    const m = reTopic.exec(location.href);
    if (!m)
      return;
    const urlBase = location.origin + "/t/" + m[1];
    const r0 = await jsonFetch(urlBase + (m[2] ? "/" + m[2] : "") + ".json");
    if (!r0)
      return;
    const posts = [];
    const addAllPosts = (ps) => {
      ps.map((p) => {
        doCleanPostCook(p).split("\n").map((ln) => {
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
      await Promise.all(chunks.splice(0, 10).map((ids) => jsonFetch(urlBase + "/posts.json?" + ids.map((id) => `post_ids[]=${id}`).join("&")))).then((rs) => rs.map((r) => {
        if (!r) {
          isContinue = false;
          return;
        }
        addAllPosts(r.post_stream.posts);
      }));
    }
    if (!isContinue) {
      w.console.error(`Total posts: ${r0.posts_count} != real count: ${posts.length}, due to Rate Limit?`);
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
  function normalizeKana(s) {
    return s.replace(/\p{sc=Katakana}/gu, (p) => {
      const cp = p.codePointAt(0);
      if (cp) {
        return String.fromCodePoint(cp - 96);
      }
      return p;
    });
  }
  function findJa(ln) {
    const lines = [];
    for (const m of ln.matchAll(reJaWithRuby)) {
      const line = m.index !== void 0 ? [ln.substring(0, m.index), m[0], ln.substring(m.index + m[0].length)] : [ln];
      if (m[0].includes("</ruby>")) {
        lines.push({ v: normalizeKana(makeKanji(m[0])), line }, { v: normalizeKana(makeReading(m[0])), line });
      } else {
        lines.push({ v: normalizeKana(m[0]), line });
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
    const out = {
      line: ln,
      posts: [],
      vocabs: []
    };
    out.vocabs = findJa(ln).map(({ v }) => {
      const ps = vocabMap.get(v);
      if (ps) {
        Object.values(ps).map((post) => {
          const line = post._lines[v];
          if (line) {
            out.posts.push({ vocab: v, line, post });
          }
        });
      }
      return v;
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
  function distinctBy(arr, fn) {
    const u = /* @__PURE__ */ new Set();
    return arr.filter((a) => {
      const v = fn(a);
      if (u.has(v))
        return false;
      u.add(v);
      return true;
    });
  }
})();
