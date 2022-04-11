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

export type BracketParser = (
  prev: string,
  current: string,
  type: string
) => string

export function parseBracketList(
  rt: {
    s: string
    b: IBracket | undefined
  }[],
  type1: string,
  type2: string,
  parser: BracketParser,
  repeatable?: boolean
): string {
  const out: string[] = []
  for (let i = 0; i < rt.length; i++) {
    const { s, b } = rt[i]

    if (b?.name === type1 && rt[i + 1] && rt[i + 1]?.b?.name === type2) {
      let current = parser('', s.substring(1, s.length - 1), type1)

      const pushNext = () => {
        const s = rt[i + 1].s
        current = parser(current, s.substring(1, s.length - 1), type2)
        i++
      }
      pushNext()

      while (repeatable && rt[i + 1]?.b?.name === type2) {
        pushNext()
      }

      out.push(current)
      continue
    }
    out.push(s)
  }

  return out.join('')
}
