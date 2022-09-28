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
  const style = {
    el: document.createElement('style'),
    hide() {
      this.el.innerHTML = `#character [lang="ja"] { visibility: hidden }`;
    },
    show() {
      this.el.innerHTML = '';
    },
  };
  style.el.setAttribute(`data-${IDENTIFIER}`, '');
  document.head.append(style.el);

  const onNewVocabulary = () => {
    const c = $.jStorage.get('currentItem');
    if (!c || !('voc' in c) || !c.aud) {
      return;
    }

    const targetEl = document.querySelector('#character');
    if (!(targetEl instanceof HTMLElement)) {
      return;
    }
    style.hide();

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
    const audioEl = vocabAudioElArray[n];
    audioEl.onended = () => {
      vocabAudioElArray.map((el) => el.remove());
      style.show();
    };
    audioEl.play();
  };

  $.jStorage.listenKeyChange('currentItem', onNewVocabulary);
  onNewVocabulary();
})();
