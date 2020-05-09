import { parseJapanese } from '../js/external-def'

declare const appStoreRegistry: any
declare const GM_info: any
declare const GM_xmlhttpRequest: any

declare global {
  interface JQueryStatic {
    jStorage: any;
  }
}

const lookupMap = new Map()

$(() => {
  updateInfo()

  $.jStorage.listenKeyChange('currentItem', function () {
    updateInfo()
  })
})

const observer = new MutationObserver(function (mutations) {
  let doUpdate = false

  mutations.forEach(function (mutation) {
    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement &&
        node.matches('#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information')) {
        doUpdate = true
      }
    })
  })

  if (doUpdate) {
    updateInfo()
  }
})

observer.observe(document.body, {
  attributes: true,
  childList: true,
  characterData: true,
  subtree: true
})

async function scrape (url: string) {
  return new Promise<string>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload: (data: any) => {
        resolve(data.responseText)
      },
      onerror: (data: any) => {
        reject(data.statusText)
      }
    })
  })
}

async function updateInfo () {
  const word = (() => {
    const m = /wanikani\.com\/(?:kanji|vocabulary)\/(.+)$/.exec(location.href)
    if (m) {
      return decodeURIComponent(m[1].replace(/する$/, ''))
    }

    const it = $.jStorage.get('currentItem')
    return it.kan || it.voc
  })()

  if (!word) {
    return
  }

  const { kanjipedia, kanjipediaUrl, weblio, weblioUrl } = lookupMap.get(word) || await parseJapanese(word, scrape)
  lookupMap.set(word, { kanjipedia, kanjipediaUrl, weblio, weblioUrl })

  const $dialog = $('<div id="external-def">')
  const $meanings = $('#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning')
  if ($meanings.length > 0) {
    $meanings.prepend($dialog)
  } else {
    $('#information').append($dialog)
  }

  if (kanjipedia) {
    const $kanjipedia = $('<section class="kanjipedia"></section>')
    $dialog.append($kanjipedia)

    if ($.jStorage.get('questionType') === 'reading') $('.kanjipedia').css('display', 'none')

    $kanjipedia.html(
      kanjipedia +
      '<br><a href="' + kanjipediaUrl + '" target="_blank">Click for full entries</a>')
    $kanjipedia.prepend('<h2>Kanjipedia Explanation</h2>')
  }

  if (weblio.length > 0) {
    const $weblio = $('<section class="weblio"></section>')
    $dialog.append($weblio)

    if ($.jStorage.get('questionType') === 'reading') $('.weblio').css('display', 'none')

    $weblio.html('')
    weblio.map((w: string) => {
      $weblio.append(w)
    })
    $weblio.append('<br><a href="' + weblioUrl + '" target="_blank">Click for full entries</a>')

    $weblio.prepend('<h2>Weblio Explanation</h2>')
  }
}

// @ts-ignore
try { $('.app-store-menu-item').remove(); $('<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>').insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")')); window.appStoreRegistry = window.appStoreRegistry || {}; window.appStoreRegistry[GM_info.script.uuid] = GM_info; localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry) } catch (e) {}
