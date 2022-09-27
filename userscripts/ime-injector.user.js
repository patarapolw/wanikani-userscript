// ==UserScript==
// @name         WanaKana IME Injector
// @namespace    polv
// @version      0.1
// @description  WanaKana IME Injector
// @author       polv
// @match        https://gearoid.me/pokemon/
// @require      https://unpkg.com/wanakana
// @grant        none
// ==/UserScript==

// !buggy

(function () {
  'use strict';

  const INJECTION_LIST = ['input#pokemonGuess'];

  injectObserver();

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
      subtree: true,
    });
    inject(el);
  }

  function inject(el) {
    INJECTION_LIST.map((inj) => {
      if (el.matches(inj)) {
        wanakana.bind(el);
      }
      el.querySelectorAll(inj).forEach((it) => {
        wanakana.bind(it);
      });
    });
  }
})();
