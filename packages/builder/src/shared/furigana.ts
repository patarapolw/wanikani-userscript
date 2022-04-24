import {
  BracketParser,
  IBracket,
  parseContiguousBrackets,
  tagParser
} from './brackets'
import { isCode } from './code-block'
import { escapeRegExp } from './regex'
import { ISegment } from './segments'

const baseBracket: IBracket = {
  name: 'base',
  on: '[',
  off: ']',
  content: ''
}

const furiganaBracket: IBracket = {
  name: 'furigana',
  on: '{',
  off: '}',
  content: ''
}

const FURIGANA_REGEX = new RegExp(
  [
    escapeRegExp(baseBracket.on),
    '(.+)',
    escapeRegExp(baseBracket.off),
    '(?:',
    escapeRegExp(furiganaBracket.on),
    '(.+)',
    escapeRegExp(furiganaBracket.off),
    ')+'
  ].join(''),
  'g'
)

export function makeFurigana(segs: ISegment[]) {
  const parser: BracketParser = (prev, c, t) => {
    switch (t) {
      case 'furigana':
        return `<ruby md><rp> </rp>${prev}<rp>(</rp><rt md>${c}</rt><rp>)</rp></ruby>`
    }

    return c
  }

  return segs.map((p) => {
    if (!isCode(p)) {
      p.s = p.s.replace(FURIGANA_REGEX, (...m: string[]) => {
        return parseContiguousBrackets(
          m[0],
          baseBracket,
          furiganaBracket,
          parser,
          {
            repeatable: true,
            deep: true
          }
        )
      })
    }

    return p
  })
}

export function normalizeFurigana(segs: ISegment[]): ISegment[] {
  return segs.flatMap((p) => {
    if (isCode(p)) return [p]

    return tagParser(p.s, 'html').flatMap((q) => {
      const is = q.b?.name || ''

      if (q.b && q.b.name === 'ruby') {
        let base = ''
        const rt: string[] = []

        const doParse = (s: string) => {
          if (/<rt.*>[^]+<\/rt>/.test(s)) {
            const children = tagParser(s, 'html')
            const s1 = children
              .map((r) => {
                if (r.b) {
                  switch (r.b.name) {
                    case 'rt':
                      rt.push(
                        normalizeFurigana([{ s: r.b.content, is: '' }])
                          .map((a) => a.s)
                          .join('')
                      )
                      return ''
                    case 'rp':
                      return ''
                    case 'ruby':
                      if (/<rt.*>[^]+<\/rt>/.test(r.b.content)) {
                        doParse(r.b.content)
                        return ''
                      }
                  }
                }

                return r.s
              })
              .join('')

            base += s1
          }
        }

        if (/<rt.*>[^]+<\/rt>/.test(q.b.content)) {
          doParse(q.b.content)
        }

        if (rt.length) {
          return [
            {
              s: baseBracket.on + base + baseBracket.off,
              is: 'furigana-base'
            },
            ...rt.map((s) => ({
              s: furiganaBracket.on + s + furiganaBracket.off,
              is: 'furigana-furigana'
            }))
          ]
        }
      }

      return [{ s: q.s, is }]
    })
  })
}
