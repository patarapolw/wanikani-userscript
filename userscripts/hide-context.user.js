// ==UserScript==
// @name        WaniKani Hide Context Sentence
// @namespace   rfindley
// @description Hide context sentences until hovered.
// @version     1.0.4
// @match       https://www.wanikani.com/review/session*
// @match       https://www.wanikani.com/lesson/session*
// @match       https://www.wanikani.com/vocabulary/*
// @match       https://www.wanikani.com/level/*/vocabulary/*
// @copyright   2015+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function (gobj) {
  var css =
    '.context-sentence-group p:not([lang="ja"]):not(:hover), ' +
    '.subject-collocations__collocation-text:not([lang="ja"]):not(:hover), ' +
    'p[lang="ja"] + p:not(:hover) {' +
    '  background-color:#ccc;' +
    '  color:#ccc;' +
    '  text-shadow:none;' +
    '}' +
    '.subject-collocations__collocations {' +
    '  flex-grow: 1;' +
    '}';

  // Insert CSS
  add_css(css);

  function add_css(css) {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
})();
