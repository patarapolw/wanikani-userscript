export interface ISegment {
  s: string
  is: string
}

export type Renderer = (s: string) => string

export type SegmentParser = (
  ps: ISegment[],
  is: string | undefined,
  fn: Renderer
) => ISegment[]

export default class SegmentedParser {
  parts: ISegment[]

  constructor(s: string, public renderer: Renderer) {
    this.parts = [{ s, is: '' }]
  }

  doParse(fn: SegmentParser, is?: string): this {
    this.parts = fn(this.parts, is, this.renderer)
    return this
  }

  render(fnMap: { [is: string]: (s: string, renderer: Renderer) => string }) {
    const markdown = this.parts
      .map((p) => fnMap[p.is]?.(p.s, this.renderer) || p.s)
      .join('')

    return {
      markdown,
      html: () => {
        return this.renderer(markdown)
      }
    }
  }
}
