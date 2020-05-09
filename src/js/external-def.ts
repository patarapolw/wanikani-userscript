import cheerio from 'cheerio'

function fixUrl ($$: CheerioStatic, baseUrl: string) {
  $$('a').each((_, el) => {
    $$(el).attr('href', new URL($$(el).attr('href')!, baseUrl).href)
  })
  $$('img').each((_, el) => {
    $$(el).attr('src', new URL($$(el).attr('src')!, baseUrl).href)
  })
}

async function parseJapanese (q: string, getFunction: (url: string) => Promise<string>) {
  let result = {} as Record<string, any>
  if (q.length === 1) {
    result = await parseKanjipedia(q, getFunction)
  }

  const weblio = await parseWeblio(q, getFunction)

  result = { ...result, ...weblio }
  return result
}

async function parseKanjipedia (q: string, getFunction: (url: string) => Promise<string>) {
  const urlBase = 'https://www.kanjipedia.jp/'
  const html: string = await getFunction(`${urlBase}search?k=${q}&kt=1&sk=leftHand`)
  let $$ = cheerio.load(html)
  const trueUrl = new URL($$('#resultKanjiList a').attr('href')!, urlBase).href
  $$ = cheerio.load(await getFunction(trueUrl))
  fixUrl($$, urlBase)

  return {
    kanjipedia: $$('#kanjiRightSection').find('p').html(),
    kanjipediaUrl: trueUrl
  }
}

async function parseWeblio (q: string, getFunction: (url: string) => Promise<string>) {
  const url = 'https://www.weblio.jp/content/' + q
  const html = await getFunction(url)

  const $$ = cheerio.load(html)
  fixUrl($$, 'https://www.weblio.jp')

  return {
    weblio: $$('.NetDicBody').toArray().map((el) => $$(el).html() || '').filter((el) => el !== ''),
    weblioUrl: url
  }
}

export { parseJapanese };
(window as any).external_definition = { parseJapanese }
