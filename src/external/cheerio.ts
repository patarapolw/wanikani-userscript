import cheerio from 'cheerio'

declare global {
  interface Window {
    cheerio: CheerioStatic
  }
}

window.cheerio = cheerio
