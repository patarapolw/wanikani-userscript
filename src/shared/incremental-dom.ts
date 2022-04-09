import { Parser } from 'htmlparser2'

declare global {
  interface Window {
    virtualDom: typeof import('incremental-dom')
  }
}

export function makeIncremental(s: string): () => void {
  // @ts-ignore
  const { virtualDom, console } = getWindow()
  const { elementOpen, elementClose, text } = virtualDom

  const open = (name: string, attr: Record<string, string> = {}) => {
    console.log(attr)

    elementOpen(
      name,
      name + '-' + cyrb53(JSON.stringify(attr)),
      Object.values(attr).flat()
    )
  }

  const close = (name: string) => {
    elementClose(name)
  }

  const iDOMParser = new Parser(
    {
      onopentag: open,
      ontext: text,
      onclosetag: close
    },
    {
      decodeEntities: true,
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true
    }
  )

  return () => {
    iDOMParser.write(s)
  }
}

/**
 * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
 *
 * https://stackoverflow.com/a/52171480/9023855
 *
 * @param str
 * @param seed
 */
export function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}
