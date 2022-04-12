import { isCode } from './code-block'

export interface ISegment {
  s: string
  is: string
}

export type Renderer = (s: string) => string

export type SegmentParser = (ps: ISegment[], is: string) => ISegment[]

export class SegmentedParser {
  parts: ISegment[]

  constructor(s: string) {
    this.parts = [{ s, is: '' }]
  }

  append(s: string, is = '') {
    if (s) {
      this.parts.push({ s, is })
    }
  }

  doParse(fn: SegmentParser, is = ''): this {
    const parts = fn(this.parts, is)
    let pending = ''
    this.parts = []
    parts.map((p) => {
      if (isCode(p)) {
        this.append(pending)
        pending = ''
        this.parts.push(p)
      } else {
        pending += p.s
      }
    })
    this.append(pending)

    return this
  }

  render(fnMap: { [is: string]: (s: string) => string } = {}) {
    return this.parts.map((p) => fnMap[p.is]?.(p.s) || p.s).join('')
  }
}
