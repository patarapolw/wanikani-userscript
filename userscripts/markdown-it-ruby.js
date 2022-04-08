// ==UserScript==
// @name         Editor overlay for WaniKani Community
// @namespace    https://community.wanikani.com
// @version      0.1
// @description  Editor overlay for WaniKani Community.
// @author       polv
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  /**
   *
   * @param {string} raw
   * @returns
   */
  function fromVanilla(raw) {
    return raw
  }

  /**
   *
   * @param {string} raw
   * @returns
   */
  function toVanilla(raw) {
    return raw
  }

  /** @type {HTMLTextAreaElement} */
  let elTextArea = null
  const getTextArea = () => document.querySelector('textarea.d-editor-input')

  function initTextArea() {
    if (!(elTextArea = getTextArea())) {
      const obs = new MutationObserver(() => {
        if ((elTextArea = getTextArea())) {
          obs.disconnect()
          onNewTextArea()
        }
      })

      obs.observe(document.body, {
        childList: true,
        subtree: true
      })
    } else {
      onNewTextArea()
    }
  }

  function onNewTextArea() {
    elTextArea.value = fromVanilla(elTextArea.value)

    const endObs = new MutationObserver(() => {
      if (!getTextArea()) {
        elTextArea = null
        endObs.disconnect()
        onCloseTextArea()
      }
    })
    endObs.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  function onCloseTextArea() {
    initTextArea()
  }

  let alreadyInjected = false
  function injectIntoDiscourse() {
    if (alreadyInjected) return
    alreadyInjected = true
    // greasemonkey workaround: unsafeWindow + exportFunction
    let w = typeof unsafeWindow === 'undefined' ? window : unsafeWindow
    let e = typeof exportFunction === 'undefined' ? (o) => o : exportFunction
    injectCustomCook(w, e)
    injectCustomSave(w, e)

    let oldCook = w.require('pretty-text/engines/discourse-markdown-it').cook
    w.require('pretty-text/engines/discourse-markdown-it').cook = e(
      (raw, opts) => oldCook(toVanilla(raw), opts),
      w
    )

    let oldSave = w.require('discourse/controllers/composer').default.prototype
      .save
    w.require('discourse/controllers/composer').default.prototype.save = e(
      function (t) {
        tText.value = toVanilla(tText.value)
        tText.dispatchEvent(
          new Event('change', { bubbles: true, cancelable: true })
        )
        oldSave.call(this, t)
      },
      w
    )
  }

  injectIntoDiscourse()
  initTextArea()
})()
