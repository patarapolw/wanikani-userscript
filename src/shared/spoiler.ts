import { tagParser } from './brackets'
import { isCode } from './code-block'
import { ISegment } from './segments'

export function makeDiscordSpoiler(segs: ISegment[], is = ''): ISegment[] {
  is = is || 'spoiler'
  return segs.flatMap((p) => {
    if (isCode(p)) return [p]

    const output = {
      segs: [] as ISegment[],
      push(seg: ISegment) {
        this.segs.push(seg)
      }
    }

    let isIt = false
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
          if (isIt) {
            const tag = current.includes('\n') ? 'div' : 'span'
            output.push({
              s: `<${tag} class="spoiler" md>${current}</${tag}>`,
              is
            })
          } else {
            output.push({ s: current, is: '' })
          }

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
}

export function checkSpoiler(segs: ISegment[]): ISegment[] {
  return segs.flatMap((p) => {
    if (isCode(p)) return [p]

    const tags = tagParser(p.s, 'html')
    const out: ISegment[] = []

    tags.flatMap((t, i) => {
      if (t.b && t.b.attrs.class === 'spoiler') {
        let op = '||'
        let ed = '||'
        if (i > 0) {
          const a = tags[i - 1].s
          if (['|', '\\'].includes(a[a.length - 1])) {
            op = ' ' + op
          }
        }
        if (i < tags.length - 1) {
          const a = tags[i + 1].s
          if (['|', '\\'].includes(a[a.length - 1])) {
            ed = ed + ' '
          }
        }

        out.push({ s: op + t.b.content + ed, is: 'spoiler' })
      } else if (t.b) {
        console.log(t)
        out.push(
          { s: t.b.on, is: '' },
          ...checkSpoiler([{ s: t.b.content, is: '' }]),
          { s: t.b.off, is: '' }
        )
      } else {
        out.push({ s: t.s, is: '' })
      }
    })

    return out
  })
}
