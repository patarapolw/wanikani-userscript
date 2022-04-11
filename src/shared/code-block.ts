import { ISegment } from './segments'

export function makeCodeBig(segs: ISegment[], is = 'code_big'): ISegment[] {
  return segs
    .map((p) => {
      if (isCode(p)) return [p]

      return p.s
        .split(/((?:^|\n)```.*\r?\n[^]*?```(?:\r?\n|$))/g)
        .map((s, i) => ({ s, is: i & 1 ? is : '' }))
    })
    .reduce((prev, c) => [...prev, ...c])
}

export function makeCodeSmall(segs: ISegment[], is = 'code_small'): ISegment[] {
  return segs
    .map((p) => {
      if (isCode(p)) return [p]

      let out: ISegment[] = []
      let t = false
      let s = ''

      const segs = p.s.split('`')
      segs.map((seg, i) => {
        s += seg
        const prevSeg = segs[i - 1] || ''
        if (prevSeg[prevSeg.length - 1] !== '\\') {
          out.push({ s, is: t ? is : '' })
          s = ''
          t = !t
        }

        if (i < segs.length - 1) {
          s += '`'
        }
      })
      out.push({ s, is: t ? is : '' })

      return out
    })
    .reduce((prev, c) => [...prev, ...c])
}

export function makeCode(segs: ISegment[]): ISegment[] {
  return makeCodeSmall(makeCodeBig(segs))
}

export function isCode(seg: ISegment) {
  return seg.is.startsWith('code_')
}
