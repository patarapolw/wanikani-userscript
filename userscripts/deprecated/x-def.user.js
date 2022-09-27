// ==UserScript==
// @name         WaniKani External Definition
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      1.0
// @description  Get External Definition from JJ Dictionaries, such as Weblio, Kanjipedia
// @author       polv
// @grant        GM_xmlhttpRequest
// @connect      https://www.kanjipedia.jp/
// @connect      https://*.weblio.jp
// ==/UserScript==

(() => {
  // src/shared/deprecated/x-def.ts
  function changeOrigin(src, root) {
    const { origin } = new URL(root);
    return new URL(new URL(src, origin).pathname, origin).href;
  }
  var ExternalDefinition = class {
    constructor(getFunction, opts = {}) {
      this.opts = opts;
      this.getFunction = async (url) => {
        return getFunction(url).then((s) => {
          const { origin } = new URL(url);
          return s.replace(/(href|src)="\/([^"]+)/gi, (p0, p1, p2) => {
            return p2[0] === "/" ? p0 : `${p1}="${origin}/${p2}`;
          });
        });
      };
    }
    async kanjipedia(q) {
      var _a, _b;
      if (!q.trim())
        return null;
      const url = `https://www.kanjipedia.jp/search?k=${encodeURIComponent(q)}&kt=1&sk=leftHand`;
      const elHtml = document.createElement("div");
      elHtml.innerHTML = await this.getFunction(url);
      elHtml.querySelectorAll("script").forEach((el) => el.remove());
      const firstResult = elHtml.querySelector("#resultKanjiList a");
      if (!firstResult) {
        return null;
      }
      const trueUrl = changeOrigin(firstResult.href, url);
      elHtml.innerHTML = await this.getFunction(trueUrl);
      elHtml.querySelectorAll("script").forEach((el) => el.remove());
      const html = `<div class="kanjipedia">${(((_a = elHtml.querySelector("#onkunList")) == null ? void 0 : _a.outerHTML) || "") + (((_b = elHtml.querySelector("#kanjiRightSection")) == null ? void 0 : _b.outerHTML) || "")}</div>`;
      elHtml.remove();
      return {
        html,
        url: trueUrl
      };
    }
    async weblio(q) {
      var _a;
      if (!q.trim())
        return null;
      const url = "https://www.weblio.jp/content/" + encodeURIComponent(q);
      const elHtml = document.createElement("div");
      elHtml.innerHTML = await this.getFunction(url);
      const html = `<div class="weblio">${((_a = Array.from(elHtml.querySelectorAll(".kiji")).filter((el) => (el.textContent || "").trim())[0]) == null ? void 0 : _a.outerHTML) || ""}</div>`;
      elHtml.remove();
      if (!html)
        return null;
      return {
        html,
        url
      };
    }
  };

  // src/deprecated/x-def.ts
  if (!document.querySelector('style[data-userscript-polv="external-def"]')) {
    const style = document.createElement("style");
    style.setAttribute("data-userscript-polv", "external-def");
    style.textContent = `@import url("https://cdn.jsdelivr.net/gh/patarapolw/wanikani-userscript@1.1.1/css/kanjipedia.css");`;
    document.head.append(style);
  }
  function scrape(url) {
    return new Promise(function(resolve, reject) {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: function(data) {
          resolve(data.responseText);
        },
        onerror: reject
      });
    });
  }
  var lookupMap = /* @__PURE__ */ new Map();
  var extDef = new ExternalDefinition(scrape);
  $(() => {
    updateInfo();
    $.jStorage.listenKeyChange("currentItem", function() {
      updateInfo();
    });
  });
  var observer = new MutationObserver(function(mutations) {
    let doUpdate = false;
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.matches("#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information")) {
          doUpdate = true;
        }
      });
    });
    if (doUpdate) {
      updateInfo();
    }
  });
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
  });
  async function updateInfo() {
    const word = (() => {
      const m = /wanikani\.com\/(?:kanji|vocabulary)\/(.+)$/.exec(location.href);
      if (m) {
        return decodeURIComponent(m[1].replace(/する$/, ""));
      }
      const it = $.jStorage.get("currentItem");
      return it.kan || it.voc;
    })();
    if (!word) {
      return;
    }
    const v = lookupMap.get(word) || await Promise.all([extDef.kanjipedia(word), extDef.weblio(word)]).then(([k, w]) => ({
      kanjipedia: k,
      weblio: w
    }));
    lookupMap.set(word, v);
    const $dialog = $('<div id="external-def">');
    const $meanings = $("#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning");
    if ($meanings.length > 0) {
      $meanings.prepend($dialog);
    } else {
      $("#information").append($dialog);
    }
    if (v.kanjipedia) {
      const $kanjipedia = $('<section class="kanjipedia"></section>');
      $dialog.append($kanjipedia);
      if ($.jStorage.get("questionType") === "reading") {
        $(".kanjipedia").css("display", "none");
      }
      $kanjipedia.html(v.kanjipedia.html);
      $kanjipedia.append($("<br>"));
      $kanjipedia.append($('<a target="_blank" rel="noopener noreferrer">Click for full entries</a>').attr("href", v.kanjipedia.url));
      $kanjipedia.prepend("<h2>Kanjipedia Explanation</h2>");
    }
    if (v.weblio) {
      const $weblio = $('<section class="weblio"></section>');
      $dialog.append($weblio);
      if ($.jStorage.get("questionType") === "reading") {
        $(".weblio").css("display", "none");
      }
      $weblio.html(v.weblio.html);
      $weblio.append($("<br>"));
      $weblio.append($('<a target="_blank" rel="noopener noreferrer">Click for full entries</a>').attr("href", v.weblio.url));
      $weblio.prepend("<h2>Weblio Explanation</h2>");
    }
  }
  try {
    $(".app-store-menu-item").remove();
    $('<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>').insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")'));
    window.appStoreRegistry = window.appStoreRegistry || {};
    window.appStoreRegistry[GM_info.script.uuid] = GM_info;
    localStorage.appStoreRegistry = JSON.stringify(window.appStoreRegistry);
  } catch (e) {
  }
})();
