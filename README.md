# WaniKani Userscript

A GitHub source for `polv`'s userscripts.

## Demo

See <http://patarapolw.github.io/wanikani-userscript>

## Usage

I recommend you to use UserScript's native `GM_xmlhttpRequest` and `@connect`, rather than `https://cors-anywhere.herokuapp.com/`, so

```javascript
// ==UserScript==
// [...]
// @require      https://patarapolw.github.io/wanikani-userscript/dist/external_definition.js
// @grant        GM_xmlhttpRequest
// @connect      kanjipedia.jp
// @connect      weblio.jp
// ==/UserScript==

(function() {
    'use strict';

    function getFunction(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(data) { resolve(data.responseText) },
                onerror: reject
            });
        })
    }

    external_definition.parseJapanese(word, getFunction).then(function(r) {
        ...;
    })
})();
```
