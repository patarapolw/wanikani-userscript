// ==UserScript==
// @name         markdown-it-ruby for WaniKani Community
// @namespace    https://community.wanikani.com
// @version      0.1
// @description  markdown-it-ruby for WaniKani Community. Nothing more than necessary
// @author       polv
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const plugin = (function () {
    // Copied from https://github.com/lostandfound/markdown-it-ruby

    function ddmd_ruby(state, silent) {
      var token,
        tokens,
        max = state.posMax,
        start = state.pos,
        devPos,
        closePos,
        baseText,
        rubyText,
        baseArray,
        rubyArray

      if (silent) {
        return false
      }
      if (state.src.charCodeAt(start) !== 0x7b /* { */) {
        return false
      }
      if (start + 4 >= max) {
        return false
      }

      state.pos = start + 1

      while (state.pos < max) {
        if (devPos) {
          if (
            state.src.charCodeAt(state.pos) === 0x7d /* } */ &&
            state.src.charCodeAt(state.pos - 1) !== 0x5c /* \ */
          ) {
            closePos = state.pos
            break
          }
        } else if (
          state.src.charCodeAt(state.pos) === 0x7c /* | */ &&
          state.src.charCodeAt(state.pos - 1) !== 0x5c /* \ */
        ) {
          devPos = state.pos
        }

        state.pos++
      }

      if (!closePos || start + 1 === state.pos) {
        state.pos = start
        return false
      }

      state.posMax = state.pos
      state.pos = start + 1

      token = state.push('ruby_open', 'ruby', 1)
      token.markup = '{'

      baseText = state.src.slice(start + 1, devPos)
      rubyText = state.src.slice(devPos + 1, closePos)

      baseArray = baseText.split('')
      rubyArray = rubyText.split('|')

      if (baseArray.length === rubyArray.length) {
        baseArray.forEach(function (content, idx) {
          state.md.inline.parse(content, state.md, state.env, (tokens = []))

          tokens.forEach(function (t) {
            state.tokens.push(t)
          })

          token = state.push('rt_open', 'rt', 1)

          state.md.inline.parse(
            rubyArray[idx],
            state.md,
            state.env,
            (tokens = [])
          )

          tokens.forEach(function (t) {
            state.tokens.push(t)
          })

          token = state.push('rt_close', 'rt', -1)
        })
      } else {
        state.md.inline.parse(baseText, state.md, state.env, (tokens = []))

        tokens.forEach(function (t) {
          state.tokens.push(t)
        })

        token = state.push('rt_open', 'rt', 1)

        state.md.inline.parse(rubyText, state.md, state.env, (tokens = []))

        tokens.forEach(function (t) {
          state.tokens.push(t)
        })

        token = state.push('rt_close', 'rt', -1)
      }

      token = state.push('ruby_close', 'ruby', -1)
      token.markup = '}'

      state.pos = state.posMax + 1
      state.posMax = max

      return true
    }

    function ruby_plugin(md) {
      md.inline.ruler.before('text', 'ddmd_ruby', ddmd_ruby)
    }

    return ruby_plugin
  })()

  const markdownIt = require('pretty-text/engines/discourse-markdown-it')
  const oldCook = markdownIt.cook

  markdownIt.cook = function (raw, opts) {
    opts.engine.use(plugin)
    return oldCook.bind(this)(raw, opts)
  }
})()
