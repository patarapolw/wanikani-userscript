export interface IBracket {
  name: string
  on: string
  off: string
}

export function bracketMatcher(raw: string, bTypes: IBracket[]) {
  let s = ''
  let type: IBracket | undefined

  const rt: {
    s: string
    b: IBracket | undefined
  }[] = []
  const brackets: string[] = []

  const onMap = Object.fromEntries(bTypes.map((v) => [v.on, v]))
  const offMap = Object.fromEntries(bTypes.map((v) => [v.off, v]))

  raw.split('').map((c) => {
    let b: IBracket | undefined

    if ((b = onMap[c])) {
      if (!type && s) {
        rt.push({ s, b: type })
        s = ''
      }

      type = type || b

      if (type && type.name === b.name) {
        brackets.push(type.name)
        s += c
        return
      }
    }

    s += c

    if ((b = offMap[c])) {
      if (brackets[brackets.length - 1] === b.name) {
        brackets.pop()
        if (!brackets.length) {
          rt.push({ s, b })
          s = ''
          type = undefined
        }
        return
      }
    }
  })

  if (s) {
    rt.push({ s, b: type })
  }

  return rt
}

interface BracketedString {
  s: string
  b: IBracket | undefined
}

function deBracket({ s, b }: BracketedString) {
  if (!b) return s
  return s.substring(b.on.length, s.length - b.off.length)
}

function hasBracket(s: string, b: IBracket) {
  const i = s.indexOf(b.on)
  const j = s.split('').reverse().join('').indexOf(b.off)
  return i >= 0 && j >= 0 && s.length - j > i
}

export type BracketParser = (
  prev: string,
  current: string,
  type: string
) => string

export function parseContiguousBrackets(
  raw: string,
  b1: IBracket,
  b2: IBracket,
  parser: BracketParser,
  opts: {
    repeatable?: boolean
    deep?: boolean
  } = {}
): string {
  const deepS = (r: BracketedString) => {
    if (r.b && opts.deep && hasBracket(r.s, r.b)) {
      r.s = parseContiguousBrackets(deBracket(r), b1, b2, parser, opts)
    }
    return r.s
  }

  const rt = bracketMatcher(raw, [b1, b2])

  const out: string[] = []
  for (let i = 0; i < rt.length; i++) {
    const { b } = rt[i]

    if (b?.name === b1.name && rt[i + 1] && rt[i + 1]?.b?.name === b2.name) {
      let current = parser('', deepS(rt[i]), b1.name)

      const pushNext = () => {
        current = parser(current, deepS(rt[i + 1]), b2.name)
        i++
      }
      pushNext()

      while (opts.repeatable && rt[i + 1]?.b?.name === b2.name) {
        pushNext()
      }

      out.push(current)
      continue
    }
    out.push(deepS(rt[i]))
  }

  return out.join('')
}
