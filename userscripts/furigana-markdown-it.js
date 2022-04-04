// ==UserScript==
// @name         furigana-markdown-it for WaniKani Community
// @namespace    https://community.wanikani.com
// @version      0.1
// @description  furigana-markdown-it for WaniKani Community. Nothing more than necessary.
// @author       polv
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const rubyHelper = (function () {
    // Copied from https://github.com/iltrof/furigana-markdown-it/blob/master/lib/ruby.js

    /**
     * Parses the [body]{toptext} syntax and returns
     * the body and toptext parts. These are then processed
     * in furigana.js and turned into \<ruby\> tags by
     * the {@link addTag} function.
     *
     * @param {*} state Markdown-it's inline state.
     * @returns {{body: string, toptext: string, nextPos: int}}
     * body: the main text part of the \<ruby\> tag.
     *
     * toptext: the top part of the \<ruby\> tag.
     *
     * nextPos: index of the next character in the markdown source.
     */
    function parse(state) {
      if (state.src.charAt(state.pos) !== '[') {
        return null
      }

      const bodyStartBracket = state.pos
      const bodyEndBracket = state.src.indexOf(']', bodyStartBracket)

      if (
        bodyEndBracket === -1 ||
        bodyEndBracket >= state.posMax ||
        state.src.charAt(bodyEndBracket + 1) !== '{'
      ) {
        return null
      }

      const toptextStartBracket = bodyEndBracket + 1
      const toptextEndBracket = state.src.indexOf('}', toptextStartBracket)

      if (toptextEndBracket === -1 || toptextEndBracket >= state.posMax) {
        return null
      }

      const body = state.src.slice(bodyStartBracket + 1, bodyEndBracket)
      const toptext = state.src.slice(
        toptextStartBracket + 1,
        toptextEndBracket
      )
      if (body.trim() === '' || toptext.trim() === '') {
        return null
      }

      return {
        body: body,
        toptext: toptext,
        nextPos: toptextEndBracket + 1
      }
    }

    /**
     * Takes as content a flat array of main parts of
     * the ruby, each followed immediately by the text
     * that should show up above these parts.
     *
     * That content is then stored in its appropriate
     * representation in a markdown-it's inline state,
     * eventually resulting in a \<ruby\> tag.
     *
     * This function also gives you the option to add
     * fallback parentheses, should the \<ruby\>
     * tag be unsupported. In that case, the top text
     * of the ruby will instead be shown after the main
     * text, surrounded by these parentheses.
     *
     * @example
     * addTag(state, ['猫', 'ねこ', 'と', '', '犬', 'いぬ'])
     * // markdown-it will eventually produce a <ruby> tag
     * // with 猫と犬 as its main text, with ねこ corresponding
     * // to the 猫 kanji, and いぬ corresponding to the 犬 kanji.
     *
     * @param {*} state Markdown-it's inline state.
     * @param {string[]} content Flat array of main parts of
     *     the ruby, each followed by the text that should
     *     be above those parts.
     * @param {string} fallbackParens Parentheses to use
     *     as a fallback if the \<ruby\> tag happens to be
     *     unsupported. Example value: "【】".
     *     "" disables fallback parentheses.
     */
    function addTag(state, content, fallbackParens = '') {
      function pushText(text) {
        const token = state.push('text', '', 0)
        token.content = text
      }

      state.push('ruby_open', 'ruby', 1)

      for (let i = 0; i < content.length; i += 2) {
        const body = content[i]
        const toptext = content[i + 1]

        pushText(body)

        if (toptext === '') {
          state.push('rt_open', 'rt', 1)
          state.push('rt_close', 'rt', -1)
          continue
        }

        if (fallbackParens !== '') {
          state.push('rp_open', 'rp', 1)
          pushText(fallbackParens.charAt(0))
          state.push('rp_close', 'rp', -1)
        }

        state.push('rt_open', 'rt', 1)
        pushText(toptext)
        state.push('rt_close', 'rt', -1)

        if (fallbackParens !== '') {
          state.push('rp_open', 'rp', 1)
          pushText(fallbackParens.charAt(1))
          state.push('rp_close', 'rp', -1)
        }
      }

      state.push('ruby_close', 'ruby', -1)
    }

    return { parse, addTag }
  })()

  const plugin = (function () {
    // Copied from https://github.com/iltrof/furigana-markdown-it/blob/master/lib/furigana.js

    const kanaRegex = /[\u3040-\u3096\u30a1-\u30fa\uff66-\uff9fー]/
    const kanjiRegex = /[\u3400-\u9faf]/

    /**
     * Furigana is marked using the [body]{furigana} syntax.
     * First step, performed by bodyToRegex, is to convert
     * the body to a regex, which can then be used to pattern
     * match on the furigana.
     *
     * In essence, every kanji needs to be converted to a
     * pattern similar to ".?", so that it can match some kana
     * from the furigana part. However, this alone is ambiguous.
     * Consider [可愛い犬]{かわいいいぬ}: in this case there are
     * three different ways to assign furigana in the body.
     *
     * Ambiguities can be resolved by adding separator characters
     * in the furigana. These are only matched at the
     * boundaries between kanji and other kanji/kana.
     * So a regex created from 可愛い犬 should be able to match
     * か・わい・い・いぬ, but a regex created from 美味しい shouldn't
     * be able to match おいし・い.
     *
     * For purposes of this function, only ASCII dot is a
     * separators. Other characters are converted to dots in
     * the {@link cleanFurigana} function.
     *
     * The notation [可愛い犬]{か・わい・い・いぬ} forces us to
     * have separate \<rt\> tags for 可 and 愛. If we want to
     * indicate that か corresponds to 可 and わい corresponds to 愛
     * while keeping them under a single \<rt\> tag, we can use
     * a combinator instead of a separator, e.g.:
     * [可愛い犬]{か+わい・い・いぬ}
     *
     * For purposes of this function, only ASCII plus is a
     * combinator. Other characters are converted to pluses in
     * the {@link cleanFurigana} function.
     *
     * @param {string} body The non-furigana part.
     * @returns {(null|RegExp)} Null if the body contains no hiragana
     *     or kanji, otherwise a regex to be used on the furigana.
     */
    function bodyToRegex(body) {
      let regexStr = '^'
      let lastType = 'other'

      const combinatorOrSeparatorGroup = '([+.]?)'
      const combinatorOrSeparator = '[+.]?'
      const combinatorOnly = '\\.?'
      const furiganaGroup = '([^+.]+)'

      for (let i = 0; i < body.length; i++) {
        const c = body.charAt(i)
        if (kanjiRegex.test(c)) {
          if (lastType === 'kanji') {
            regexStr += combinatorOrSeparatorGroup
          } else if (lastType === 'kana') {
            regexStr += combinatorOrSeparator
          }

          regexStr += furiganaGroup
          lastType = 'kanji'
        } else if (kanaRegex.test(c)) {
          if (lastType == 'kanji') {
            regexStr += combinatorOrSeparator
          }
          regexStr += c
          lastType = 'kana'
        } else {
          if (lastType !== 'other') {
            regexStr += combinatorOnly
          }
          lastType = 'other'
        }
      }

      if (regexStr === '') {
        return null
      }
      return new RegExp(regexStr + '$')
    }

    /**
     * For a ruby tag specified as [body]{toptext}, tries to find
     * the appropriate furigana in the toptext for every kanji
     * in the body.
     *
     * The result is a flat array where each part of the body
     * is followed by its corresponding furigana. Or, if no
     * such correspondence can be found, just [body, toptext]
     * is returned.
     *
     * As a special case, if toptext starts with = or ＝, the
     * pattern-matching functionality is disabled, and only
     * [body, toptext-without-the-equals-sign] is returned.
     *
     * @example
     * r = matchFurigana('美味しいご飯', 'おいしいごはん')
     * assert(r == ['美味', 'おい', 'しいご', '', '飯', 'はん'])
     *
     * @example
     * // no match
     * r = matchFurigana('食べる', 'たべべ')
     * assert(r == ['食べる', 'たべべ'])
     *
     * @example
     * // disabled pattern matching
     * r = matchFurigana('食べる', '＝たべる')
     * assert(r == ['食べる', 'たべる'])
     *
     * @param {string} body
     * @param {string} toptext
     * @returns {string[]} Flat array of parts of the body followed
     *     by their corresponding furigana, or just [body, toptext]
     *     if no such correspondence exists.
     */
    function matchFurigana(body, toptext, options) {
      if (/^[=＝]/.test(toptext)) {
        return [body, toptext.slice(1)]
      }

      const bodyRegex = bodyToRegex(body)
      if (bodyRegex === null) {
        return [body, toptext]
      }

      const match = bodyRegex.exec(cleanFurigana(toptext, options))
      if (match === null) {
        return [body, toptext]
      }

      let result = []
      let curBodyPart = ''
      let curToptextPart = ''
      let matchIndex = 1
      let lastType = 'other'
      for (let i = 0; i < body.length; i++) {
        const c = body.charAt(i)

        if (kanjiRegex.test(c)) {
          if (lastType === 'kana' || lastType === 'other') {
            if (curBodyPart !== '') {
              result.push(curBodyPart, curToptextPart)
            }
            curBodyPart = c
            curToptextPart = match[matchIndex++]
            lastType = 'kanji'
            continue
          }

          const connection = match[matchIndex++]
          if (connection === '+' || connection === '') {
            curBodyPart += c
            curToptextPart += match[matchIndex++]
          } else {
            result.push(curBodyPart, curToptextPart)
            curBodyPart = c
            curToptextPart = match[matchIndex++]
          }
        } else {
          if (lastType !== 'kanji') {
            curBodyPart += c
            continue
          }

          result.push(curBodyPart, curToptextPart)
          curBodyPart = c
          curToptextPart = ''

          if (kanaRegex.test(c)) {
            lastType = 'kana'
          } else {
            lastType = 'other'
          }
        }
      }

      result.push(curBodyPart, curToptextPart)
      return result
    }

    /**
     * "Cleans" the furigana by converting all allowed
     * separators to ASCII dots and all allowed combinators
     * to ASCII pluses.
     *
     * The meaning of "separator" and "combinator" is
     * described in the {@link bodyToRegex} function.
     *
     * @param {string} furigana
     * @returns {string} Clean version of the furigana.
     */
    function cleanFurigana(furigana, options) {
      furigana = furigana.replace(options.separatorRegex, '.')
      furigana = furigana.replace(options.combinatorRegex, '+')
      return furigana
    }

    /**
     * Parallel to the {@link matchFurigana} function,
     * but instead of doing any matching it just adds
     * toptext to every character of the body. This
     * is intended to be used for emphasis dots, like
     * you sometimes see in manga.
     *
     * For this, toptext is expected to start with
     * an asterisk (ASCII or full-width), and the actual
     * marker that should be placed after every character
     * should follow afterward.
     *
     * If no marker is provided, a circle (●) is used.
     *
     * Since this is meant to mimic the return value of the
     * {@link matchFurigana} function, the result is just an array
     * of characters from the body followed by the marker.
     *
     * @example
     * r = rubifyEveryCharacter('だから', '*')
     * assert(r == ['だ', '●', 'か', '●', 'ら', '●'])
     *
     * @example
     * r = rubifyEveryCharacter('だから', '*+')
     * assert(r == ['だ', '+', 'か', '+', 'ら', '+'])
     *
     * @param {string} body
     * @param {string} toptext
     * @returns {string[]} Flat array of characters of the body,
     *     each one followed by the marker as specified in toptext.
     */
    function rubifyEveryCharacter(body, toptext) {
      let topmark = toptext.slice(1)
      if (topmark === '') {
        topmark = '●'
      }

      let result = []
      for (let c of body) {
        result.push(c, topmark)
      }
      return result
    }

    /**
     * Returns a function that's compatible for use with
     * markdown-it's inline ruler. The function is further
     * customizable via the options.
     *
     * Available options:
     * - fallbackParens: fallback parentheses for the resulting
     *     \<ruby\> tags. Default value: "【】".
     * - extraSeparators: additional characters that can be used
     *     to separate furigana. Empty by default. Example value:
     *     "_-*".
     *
     *     The characters that are already hard-coded as
     *     separator characters are any kind of space, as well as
     *     these: ".．。・|｜/／".
     * - extraCombinators: additional characters that can be used
     *     to indicate a kanji boundary without actually splitting
     *     the furigana. Empty by default.
     *
     *     The characters that are already hard-coded as
     *     combinator characters are '+' and '＋'.
     *
     * @param {Object} options
     */
    function furigana(options = {}) {
      options.fallbackParens = options.fallbackParens || '【】'

      options.extraSeparators = (options.extraSeparators || '').replace(
        /([\-\]\\])/g,
        '\\$1'
      )
      options.extraCombinators = (options.extraCombinators || '').replace(
        /([\-\]\\])/g,
        '\\$1'
      )

      options.separatorRegex = new RegExp(
        `[\\s.．。・|｜/／${options.extraSeparators}]`,
        'g'
      )
      options.combinatorRegex = new RegExp(
        `[+＋${options.extraCombinators}]`,
        'g'
      )

      return function (state, silent) {
        return process(state, silent, options)
      }
    }

    /**
     * Processes furigana by converting [kanji]{furigana}
     * into required markdown-it tokens. This is meant to be
     * hooked up to markdown-it's inline ruleset.
     *
     * Refer to {@link furigana} for available options.
     *
     * @param {*} state Markdown-it's inline state.
     * @param {boolean} silent If true, no tokens are actually generated.
     * @param {Object} options
     * @returns {boolean} Whether the function successfully processed the text.
     */
    function process(state, silent, options) {
      const ruby = rubyHelper.parse(state)
      if (ruby === null) {
        return false
      }

      state.pos = ruby.nextPos

      if (silent) {
        return true
      }

      const emphasisDotsIndicatorRegex = /^[*＊].?/
      if (emphasisDotsIndicatorRegex.test(ruby.toptext)) {
        const content = rubifyEveryCharacter(ruby.body, ruby.toptext)
        rubyHelper.addTag(state, content)
      } else {
        const content = matchFurigana(ruby.body, ruby.toptext, options)
        rubyHelper.addTag(state, content, options.fallbackParens)
      }

      return true
    }

    return furigana
  })()

  // Actual injection to Discourse

  const markdownIt = require('pretty-text/engines/discourse-markdown-it')
  const oldCook = markdownIt.cook

  markdownIt.cook = function (raw, opts) {
    opts.engine.use(plugin)
    return oldCook.bind(this)(raw, opts)
  }
})()
