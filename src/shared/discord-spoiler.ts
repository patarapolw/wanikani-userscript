import { isCode } from './code-block'
import { ISegment } from './segments'

export type DiscordSpoilerDummy = null

export function makeDiscordSpoiler(
  segs: ISegment[],
  is = 'spoiler'
): ISegment[] {
  return segs
    .map((p) => {
      if (isCode(p)) return [p]

      const output = {
        segs: [] as ISegment[],
        push(seg: ISegment) {
          this.segs.push(seg)
        }
      }

      let isSpoiler = false
      let current = ''

      const segs = p.s.split(/(\|{2,})/g)
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
              is: isSpoiler ? is : ''
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

      return output.segs
    })
    .reduce((prev, c) => [...prev, ...c])
}
