// ==UserScript==
// @name         WaniKani Audio b4 Vocab
// @namespace    polv/wanikani
// @version      0.1
// @description  Play audio before showing vocabularies in Meaning Quiz
// @author       polv
// @match        *://www.wanikani.com/review/session*
// @match        *://www.wanikani.com/extra_study/session*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

// @ts-check
/// <reference path="./types/wanikani.d.ts" />
(function () {
  'use strict';

  const IDENTIFIER = 'wk-audio-b4-vocab';

  const onNewVocabulary = () => {
    const c = $.jStorage.get('currentItem');
    if (!c || !('voc' in c) || !c.aud) {
      return;
    }

    const targetEl = document.querySelector('#character');
    if (!(targetEl instanceof HTMLElement)) {
      return;
    }
    targetEl.querySelectorAll('[lang="ja"]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.visibility = 'hidden';
      }
    });

    /**
     * @type {Record<string, HTMLAudioElement>}
     */
    const vocabAudioEls = {};
    c.aud.map((a) => {
      const identifier = `${a.pronunciation}:${a.voice_actor_id}`;
      let audioEl = vocabAudioEls[identifier];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.style.display = 'none';
        audioEl.autoplay = true;
        audioEl.onended = () => {};

        audioEl.setAttribute(`data-${IDENTIFIER}`, '');

        vocabAudioEls[identifier] = audioEl;
      }

      const source = document.createElement('source');
      source.type = a.content_type;
      source.src = a.url;

      audioEl.append(source);
    });

    const vocabAudioElArray = Object.values(vocabAudioEls);
    const n = Math.floor(vocabAudioElArray.length * Math.random());
    vocabAudioElArray[n].play().then(() => {
      vocabAudioElArray.map((el) => el.remove());
      targetEl.querySelectorAll('[lang="ja"]').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'visible';
        }
      });
    });
  };

  $.jStorage.listenKeyChange('currentItem', onNewVocabulary);
  onNewVocabulary();
})();
