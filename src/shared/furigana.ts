import { BracketParser, bracketMatcher, parseBracketList } from './brackets'
import { isCode } from './code-block'
import { escapeRegExp } from './regex'
import { ISegment } from './segments'

export const defaultFuriganaBrackets = {
  base: {
    on: '[',
    off: ']'
  },
  furigana: {
    on: '{',
    off: '}'
  }
}

export function makeParseFurigana(
  makeHTML: (s: string) => string,
  brackets = defaultFuriganaBrackets
) {
  const parser: BracketParser = (prev, c, t) => {
    c = makeHTML(c)

    switch (t) {
      case 'furigana':
        return `<ruby><rp> </rp>${prev}<rp>(</rp><rt>${c}</rt><rp>)</rp></ruby>`
    }

    return c
  }

  return (segs: ISegment[]): ISegment[] => {
    return parseFurigana(segs, brackets, parser)
  }
}

export function parseFurigana(
  segs: ISegment[],
  brackets = {
    base: {
      on: '[',
      off: ']'
    },
    furigana: {
      on: '{',
      off: '}'
    }
  },
  parser: BracketParser
) {
  const re = new RegExp(
    [
      escapeRegExp(brackets.base.on),
      '(.+)',
      escapeRegExp(brackets.base.off),
      '(?:',
      escapeRegExp(brackets.furigana.on),
      '(.+)',
      escapeRegExp(brackets.furigana.off),
      ')+'
    ].join(''),
    'g'
  )

  return segs.map((p) => {
    if (!isCode(p)) {
      p.s = p.s.replace(re, (...m: string[]) => {
        return parseBracketList(
          bracketMatcher(m[0], [
            { name: 'base', ...brackets.base },
            { name: 'furigana', ...brackets.furigana }
          ]),
          'base',
          'furigana',
          parser,
          true
        )
      })
    }

    return p
  })
}
