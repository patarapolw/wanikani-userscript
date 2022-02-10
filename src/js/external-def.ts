declare global {
  interface Window {
    external_definition: {
      parseJapanese: typeof parseJapanese
    }
  }
}

function fixUrl(el: HTMLElement, baseUrl: string) {
  el.querySelectorAll('a').forEach((a) => {
    a.href = new URL(a.href, baseUrl).href
  })

  el.querySelectorAll('img').forEach((img) => {
    img.src = new URL(img.src, baseUrl).href
  })
}

async function parseJapanese(
  q: string,
  getFunction: (url: string) => Promise<string>
) {
  let result = {} as Record<string, any>
  if (q.length === 1) {
    result = await parseKanjipedia(q, getFunction)
  }

  const weblio = await parseWeblio(q, getFunction)

  result = { ...result, ...weblio }
  return result
}

async function parseKanjipedia(
  q: string,
  getFunction: (url: string) => Promise<string>
) {
  const urlBase = 'https://www.kanjipedia.jp/'
  const elHtml = document.createElement('div')
  elHtml.innerHTML = await getFunction(
    `${urlBase}search?k=${encodeURIComponent(q)}&kt=1&sk=leftHand`
  )
  const firstResult = elHtml.querySelector(
    '#resultKanjiList a'
  ) as HTMLAnchorElement
  if (!firstResult) {
    return {
      kanjipedia: [],
      kanjipediaUrl: ''
    }
  }

  const trueUrl = new URL(new URL(firstResult.href, urlBase).pathname, urlBase)
    .href
  elHtml.innerHTML = await getFunction(trueUrl)
  fixUrl(elHtml, urlBase)

  return {
    kanjipedia: Array.from(elHtml.querySelectorAll('#kanjiRightSection p')).map(
      (p) => p.innerHTML
    ),
    kanjipediaUrl: trueUrl
  }
}

async function parseWeblio(
  q: string,
  getFunction: (url: string) => Promise<string>
) {
  const url = 'https://www.weblio.jp/content/' + encodeURIComponent(q)

  const elHtml = document.createElement('div')
  elHtml.innerHTML = await getFunction(url)

  fixUrl(elHtml, 'https://www.weblio.jp')

  return {
    weblio: Array.from(elHtml.querySelectorAll('.kiji'))
      .map((el) => el.innerHTML.trim())
      .filter((el) => el),
    weblioUrl: url
  }
}

export { parseJapanese }

window.external_definition = { parseJapanese }
