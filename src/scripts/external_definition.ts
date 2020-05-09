import cheerio from 'cheerio'

interface IObject {
    [key: string]: any;
}

function fixUrl ($$: CheerioStatic, baseUrl: string) {
  $$('a').each((i, el) => {
    $$(el).attr('href', new URL($$(el).attr('href')!, baseUrl).href)
  })
  $$('img').each((i, el) => {
    $$(el).attr('src', new URL($$(el).attr('src')!, baseUrl).href)
  })
}

async function parseJapanese (q: string, getFunction: (url: string) => Promise<string>) {
  let result = {} as IObject
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
  const $ = cheerio.load(html)
  const trueUrl = new URL($('#resultKanjiList a').attr('href')!, urlBase).href
  const $$ = cheerio.load(await getFunction(trueUrl))
  fixUrl($$, urlBase)

  return {
    kanjipedia: $$('#kanjiRightSection').find('p').html(),
    kanjipediaUrl: trueUrl
  }
}

async function parseWeblio (q: string, getFunction: (url: string) => Promise<string>) {
  const url = 'https://www.weblio.jp/content/' + q
  const $$ = cheerio.load(await getFunction(url))
  fixUrl($$, 'https://www.weblio.jp')

  return {
    weblio: $$('.NetDicBody').toArray().map((el) => $$(el).html() || '').filter((el) => el !== ''),
    weblioUrl: url
  }
}

export { parseJapanese };
(window as any).external_definition = { parseJapanese }