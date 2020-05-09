import { parseJapanese } from '../js/external-def'

declare const appStoreRegistry: any
declare const GM_info: any
declare const GM_xmlhttpRequest: any

declare global {
  interface JQueryStatic {
    jStorage: any;
  }
}

$.jStorage.listenKeyChange('currentItem', function () {
  updateInfo()
})

async function scrape (url: string) {
  return new Promise<string>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload: resolve,
      onerror: reject
    })
  })
}

async function updateInfo () {
  const word = $('div#character, span.japanese-font-styling-correction:first').text().trim().replace(/(する|〜)/, '')
  console.log(word)

  if (!word) {
    return
  }

  const { kanjipedia, kanjipediaUrl, weblio, weblioUrl } = await parseJapanese(word, scrape)
  console.log($('#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information'))

  if (kanjipedia.trim()) {
    const $kanjipedia = $('<section class="kanjipedia"></section>')
    $('#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information').prepend($kanjipedia)

    if ($.jStorage.get('questionType') === 'reading') $('.kanjipedia').css('display', 'none')

    $kanjipedia.html(
      kanjipedia +
      '<br><a href="' + kanjipediaUrl + '" target="_blank">Click for full entries</a>')
    $kanjipedia.prepend('<h2>Kanjipedia Explanation</h2>')
  }

  if (weblio.length > 0) {
    const $weblio = $('<section class="weblio"></section>')

    $('#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information').append($weblio)

    if ($.jStorage.get('questionType') === 'reading') $('.weblio').css('display', 'none')

    $weblio.html('')
    weblio.map((w: string) => {
      $weblio.append(w)
    })
    $weblio.append('<br><a href="' + weblioUrl + '" target="_blank">Click for full entries</a>')

    $weblio.prepend('<h2>Weblio Explanation</h2>')
  }
}

$(document.body).on(
  'ready',
  '#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information',
  () => {
    updateInfo()
  })

// @ts-ignore
try { $('.app-store-menu-item').remove(); $('<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>').insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")')); window.appStoreRegistry = window.appStoreRegistry || {}; window.appStoreRegistry[GM_info.script.uuid] = GM_info; localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry) } catch (e) {}
