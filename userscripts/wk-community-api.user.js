// ==UserScript==
// @name         WaniKani Community API
// @namespace    polv/wanikani-community
// @version      0.1
// @description  Fetch JSON from WaniKani Community (Discourse) API
// @author       polv
// @match        *://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=community.wanikani.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  Object.assign(window, {
    wkCommunity: {
      fetch: apiFetch,
      likesReceived: (acting_username) =>
        apiFetch(
          `/u/${getUsername()}/notifications/likes-received?acting_username=${acting_username}`,
        ),
      // From https://community.wanikani.com/t/userscript-like-counter/27389
      summary: () => apiFetch(`/u/${getUsername()}/summary`),
      help: 'https://docs.discourse.org/',
    },
  });

  function getUsername() {
    return ($('#current-user a').attr('href') || '').split('/u/')[1] || '';
  }

  function apiFetch(url) {
    return fetch(url, {
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        console.log(r);
        return r;
      });
  }
})();
