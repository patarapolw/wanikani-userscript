declare global {
  interface Window {
    ExternalDefinition: typeof ExternalDefinition
  }
}

export interface IGetResult {
  html: string
  url: string
}

function changeOrigin(src: string, root: string) {
  const { origin } = new URL(root)
  return new URL(new URL(src, origin).pathname, origin).href
}

export class ExternalDefinition {
  getFunction: (url: string) => Promise<string>

  constructor(
    getFunction: (url: string) => Promise<string>,
    public opts: {
      persistence?: string
    } = {}
  ) {
    this.getFunction = async (url: string) => {
      return getFunction(url).then((s) => {
        const { origin } = new URL(url)
        return s.replace(/(href|src)="\/([^"]+)/gi, (p0, p1, p2) => {
          return p2[0] === '/' ? p0 : `${p1}="${origin}/${p2}`
        })
      })
    }
  }

  async kanjipedia(q: string): Promise<IGetResult | null> {
    if (!q.trim()) return null

    const url = `https://www.kanjipedia.jp/search?k=${encodeURIComponent(
      q
    )}&kt=1&sk=leftHand`

    const elHtml = document.createElement('div')
    elHtml.innerHTML = await this.getFunction(url)
    elHtml.querySelectorAll('script').forEach((el) => el.remove())

    const firstResult = elHtml.querySelector(
      '#resultKanjiList a'
    ) as HTMLAnchorElement
    if (!firstResult) {
      return null
    }

    const trueUrl = changeOrigin(firstResult.href, url)
    elHtml.innerHTML = await this.getFunction(trueUrl)
    elHtml.querySelectorAll('script').forEach((el) => el.remove())

    const html = `<div class="kanjipedia">${
      (elHtml.querySelector('#onkunList')?.outerHTML || '') +
      (elHtml.querySelector('#kanjiRightSection')?.outerHTML || '')
    }</div>`

    elHtml.remove()

    return {
      html,
      url: trueUrl
    }
  }

  async weblio(q: string): Promise<IGetResult | null> {
    if (!q.trim()) return null

    const url = 'https://www.weblio.jp/content/' + encodeURIComponent(q)

    const elHtml = document.createElement('div')
    elHtml.innerHTML = await this.getFunction(url)

    const html = `<div class="weblio">${
      Array.from(elHtml.querySelectorAll('.kiji')).filter((el) =>
        (el.textContent || '').trim()
      )[0]?.outerHTML || ''
    }</div>`

    elHtml.remove()

    if (!html) return null

    return {
      html,
      url
    }
  }
}

Object.assign(window, { ExternalDefinition })
