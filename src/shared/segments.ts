export interface ISegment {
  s: string
  is: string
}

export default class Segments {
  parts: ISegment[]

  constructor(s: string) {
    this.parts = [{ s, is: '' }]
  }

  doParse(fn: (ps: ISegment[], is?: string) => ISegment[], is?: string): this {
    this.parts = fn(this.parts, is)
    return this
  }

  finalize(fnMap: { [is: string]: (s: string) => string }) {
    return this.parts.map((p) => fnMap[p.is]?.(p.s) || p.s).join('')
  }
}
