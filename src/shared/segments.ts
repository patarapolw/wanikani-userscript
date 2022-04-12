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

  doParse(fn: SegmentParser, is = ''): this {
    this.parts = fn(this.parts, is)
    return this
  }

  render(fnMap: { [is: string]: (s: string) => string } = {}) {
    return this.parts.map((p) => fnMap[p.is]?.(p.s) || p.s).join('')
  }
}
