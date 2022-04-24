import { tagParser } from './brackets'
import { isCode } from './code-block'
import { ISegment } from './segments'

export function makeInlineMarkdown(segs: ISegment[]): ISegment[] {
  return segs.flatMap((p) => {
    if (isCode(p)) return [p]

    return tagParser(p.s, 'html').flatMap((q) => {
      let is = p.is
      if (q.b) {
        is = q.b.name

        if (
          Object.keys(q.b.attrs).some((k) =>
            ['md', 'markdown', 'data-markdown'].includes(k)
          )
        ) {
          is = 'inline-markdown'
        }
      }

      return [{ s: q.s, is }]
    })
  })
}
