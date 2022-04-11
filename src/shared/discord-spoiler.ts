import { ISegment } from './segments'

export function makeSpoiler(raw: string, parser: (s: string) => string) {
  const output = {
    segs: [] as ISegment[],
    push(seg: ISegment) {
      this.segs.push(seg)
    },
    format() {
      return this.segs
        .map((seg) => (seg.s && seg.is === 'spoiler' ? parser(seg.s) : seg.s))
        .join('')
    }
  }

  let isSpoiler = false
  let current = ''

  const segs = raw.split(/(\|{2,})/g)
  segs.map((s, i) => {
    let isSep = i % 2 && s === '||'

    const prev = segs[i - 1] || ''
    if (prev[prev.length - 1] === '\\') {
      isSep = false
    }

    if (isSep) {
      if (current) {
        output.push({
          s: current,
          is: isSpoiler ? 'spoiler' : ''
        })
        current = ''
      }
      isSpoiler = !isSpoiler
      return
    }

    current += s
  })
  if (current) {
    output.push({ s: current, is: '' })
  }

  return output.format()
}
