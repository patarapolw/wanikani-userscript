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

      const output = {
        segs: [] as ISegment[],
        push(seg: ISegment) {
          this.segs.push(seg)
        }
      }

      let isIt = false
      let current = ''

      const segs = p.s.split(/(`{1,})/g)
      segs.map((s, i) => {
        let isSep = i % 2 && s === '`'

        const prev = segs[i - 1] || ''
        if (prev[prev.length - 1] === '\\') {
          isSep = false
        }

        if (isSep) {
          if (current) {
            if (isIt) {
              current = '`' + current + '`'
            }

            output.push({
              s: current,
              is: isIt ? is : ''
            })
            current = ''
          }
          isIt = !isIt
          return
        }

        current += s
      })
      if (current) {
        output.push({ s: current, is: '' })
      }

      return output.segs
    })
    .reduce((prev, c) => [...prev, ...c])
}

export function makeCode(segs: ISegment[]): ISegment[] {
  return makeCodeSmall(makeCodeBig(segs))
}

export function isCode(seg: ISegment) {
  return seg.is.startsWith('code_')
}
