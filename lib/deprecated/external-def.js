(() => {
  // src/deprecated/external-def.ts
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
  window.ExternalDefinition = ExternalDefinition;
})();
