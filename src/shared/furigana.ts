import { BracketParser, IBracket, parseContiguousBrackets } from './brackets'
import { isCode } from './code-block'
import { escapeRegExp } from './regex'
import { ISegment, Renderer } from './segments'

export const defaultBaseBracket: IBracket = {
  name: 'base',
  on: '[',
  off: ']'
}

export const defaultFuriganaBracket: IBracket = {
  name: 'furigana',
  on: '{',
  off: '}'
}

export function makeParseFurigana(
  segs: ISegment[],
  _: string | undefined,
  fn: Renderer,
  base = defaultBaseBracket,
  furigana = defaultFuriganaBracket
) {
  const parser: BracketParser = (prev, c, t) => {
    c = fn(c)

    switch (t) {
      case 'furigana':
        return `<ruby><rp> </rp>${prev}<rp>(</rp><rt>${c}</rt><rp>)</rp></ruby>`
    }

    return c
  }

  return parseFurigana(segs, base, furigana, parser)
}

export function parseFurigana(
  segs: ISegment[],
  base = defaultBaseBracket,
  furigana = defaultFuriganaBracket,
  parser: BracketParser
) {
  const re = new RegExp(
    [
      escapeRegExp(base.on),
      '(.+)',
      escapeRegExp(base.off),
      '(?:',
      escapeRegExp(furigana.on),
      '(.+)',
      escapeRegExp(furigana.off),
      ')+'
    ].join(''),
    'g'
  )

  return segs.map((p) => {
    if (!isCode(p)) {
      p.s = p.s.replace(re, (...m: string[]) => {
        return parseContiguousBrackets(m[0], base, furigana, parser, {
          repeatable: true,
          deep: true
        })
      })
    }

    return p
  })
}
