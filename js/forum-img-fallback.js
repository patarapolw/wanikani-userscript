// ==UserScript==
// @name         WaniKani Community Image Fallback
// @namespace    https://github.com/patarapolw/wanikani-userscript
// @version      0.1.0
// @description  Broken image quick fix, and fallback to Turtle
// @author       polv
// @license      MIT
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?domain=community.wanikani.com
// @grant        none
// ==/UserScript==

(() => {
  const DEFAULT_IMG = 'https://aws1.discourse-cdn.com/wanikanicommunity/original/3X/f/d/fd4c154120954695f788402f3bcf4e616499bc2d.png'

  function injectObserver(el = document.body) {
    new MutationObserver((muts) => {
      for (const mut of muts) {
        mut.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) {
            inject(n);
          }
        });
      }
    }).observe(el, {
      childList: true,
      subtree: true
    });
    inject(el);
  }

  function inject(el) {
    el.querySelectorAll("img").forEach((it) => {
      if (!it.onerror) {
        it.onerror = fallbackForImage(it);
      }
    });
  }

  function fallbackForImage(el) {
    let { src } = el;

    // Quick fix for https://community.wanikani.com/t/what-do-you-want-now-request-extensions-here/3838/1449?u=polv
    src = src.replace('/wanikanicommunity/wanikanicommunity/', '/wanikanicommunity/');

    // Broken: https://sjc3.discourse-cdn.com/business5/user_avatar/community.wanikani.com/radish8/40/206088_2.png
    // Works (but region-specific): https://sea2.discourse-cdn.com/wanikanicommunity/user_avatar/community.wanikani.com/radish8/45/206088_2.png
    let m = /(\/user_avatar\/community.wanikani.com.+)$/.exec(src);
    if (m) {
      src = `https://sea2.discourse-cdn.com/wanikanicommunity${m[1]}`;
    }

    if (src !== DEFAULT_IMG) {
      el.onerror = () => {
        el.src = DEFAULT_IMG;
        el.onerror = () => {};
      }
    } else {
      el.onerror = () => {};
    }

    el.src = src;
  }

  injectObserver();
})();
