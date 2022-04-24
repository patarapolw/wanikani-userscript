export interface IBracket {
  name: string
  on: string
  off: string
  content: string
}

export function bracketMatcher(raw: string, bTypes: IBracket[]) {
  let s = ''
  let type: IBracket | undefined

  const rt: {
    s: string
    b?: IBracket
  }[] = []
  const brackets: string[] = []

  const onMap = Object.fromEntries(bTypes.map((v) => [v.on, v]))
  const offMap = Object.fromEntries(bTypes.map((v) => [v.off, v]))

  raw.split('').map((c) => {
    let b: IBracket | undefined

    if ((b = onMap[c])) {
      if (!type && s) {
        rt.push({ s })
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

interface BracketedString<T extends {} = {}> {
  s: string
  b?: IBracket & T
}

export function enBracket({ s, b }: BracketedString) {
  if (!b) return s
  return b.on + s + b.off
}

export function deBracket({ s, b }: BracketedString) {
  if (!b) return s
  return s.substring(b.on.length, s.length - b.off.length)
}

export function hasBracket(s: string, b: IBracket) {
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

export function tagParser(s: string, tagType: 'html' | 'bb') {
  const allowedTag = '[a-zA-Z_-]+'
  let op = '<'
  let ed = '>'

  if (tagType === 'bb') {
    op = '\\['
    ed = '\\]'
  }

  const re = new RegExp(
    [
      `${op}(${allowedTag})`,
      `(${tagType === 'bb' ? '[ =]' : ' '}.+?)?`, // attributes
      `${ed}[^]*`,
      `${op}/\\1${ed}`
    ].join(''),
    'g'
  )

  let m: RegExpExecArray | null
  const out: BracketedString<{
    attrs: Record<string, string>
  }>[] = []
  while ((m = re.exec(s))) {
    out.push({ s: s.substring(0, m.index) })
    s = s.substring(m.index)

    const [, tag = '', meta = ''] = m

    const openingTag = tagType === 'html' ? `<${tag}` : `[${tag}`
    const closingTag = tagType === 'html' ? `</${tag}>` : `[/${tag}]`

    const offset = openingTag.length + meta.length + 1

    let nextClose = s.indexOf(closingTag, offset)
    let nextOpen = s.indexOf(openingTag, offset)

    while (nextOpen >= 0 && nextOpen < nextClose) {
      const i = s.indexOf(closingTag, nextClose + 1)
      if (i < 0) {
        break
      }

      nextClose = i
      nextOpen = s.indexOf(openingTag, nextOpen + 1)
    }

    const content = s.substring(offset, nextClose)

    if (tagType === 'html') {
      const attrs = Object.fromEntries(
        Array.from(
          meta.matchAll(/([a-zA-Z_-]+)(?:= *('[^']+'|"[^"]+"|[^ ]+))?/g)
        ).map(([, k, v]) => [k, v])
      )
      const on = `<${tag}${meta}>`
      const off = `</${tag}>`

      out.push({
        s: on + content + off,
        b: {
          name: tag,
          on,
          off,
          attrs,
          content
        }
      })
    } else {
      const attrs = Object.fromEntries(
        Array.from(
          ((meta[0] === '=' ? '_' : '') + meta).matchAll(
            /([a-zA-Z_-]+)=('[^']+'|"[^"]+"|[^ ]+)/g
          )
        ).map(([, k, v]) => [k, v])
      )

      const on = `[${tag}${meta}]`
      const off = `[/${tag}]`

      out.push({
        s: on + content + off,
        b: {
          name: tag,
          on,
          off,
          attrs,
          content
        }
      })
    }

    s = s.substring(offset + content.length + closingTag.length)
    re.lastIndex = 0
  }

  out.push({ s })

  return out
}
