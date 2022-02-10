import { ExternalDefinition, IGetResult } from '../js/external-def'

declare const appStoreRegistry: any
declare const GM_info: any
declare const GM_xmlhttpRequest: any

declare const $: any

declare global {
  interface Window {
    appStoreRegistry: any
  }

  interface JQueryStatic {
    jStorage: any
  }
}

const lookupMap = new Map<
  string,
  Record<'kanjipedia' | 'weblio', IGetResult | null>
>()
const extDef = new ExternalDefinition(scrape)

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
      if (
        node instanceof HTMLElement &&
        node.matches(
          '#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning, #information'
        )
      ) {
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

async function scrape(url: string) {
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

async function updateInfo() {
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

  const v =
    lookupMap.get(word) ||
    (await Promise.all([extDef.kanjipedia(word), extDef.weblio(word)]).then(
      ([k, w]) => ({
        kanjipedia: k,
        weblio: w
      })
    ))!
  lookupMap.set(word, v)

  const $dialog = $('<div id="external-def">')
  const $meanings = $(
    '#item-info-meaning-mnemonic, #supplement-voc-meaning, #supplement-kan-meaning'
  )
  if ($meanings.length > 0) {
    $meanings.prepend($dialog)
  } else {
    $('#information').append($dialog)
  }

  if (v.kanjipedia) {
    const $kanjipedia = $('<section class="kanjipedia"></section>')
    $dialog.append($kanjipedia)

    if ($.jStorage.get('questionType') === 'reading') {
      $('.kanjipedia').css('display', 'none')
    }

    $kanjipedia.html(v.kanjipedia.html)
    $kanjipedia.append($('<br>'))
    $kanjipedia.append(
      $(
        '<a target="_blank" rel="noopener noreferrer">Click for full entries</a>'
      ).attr('href', v.kanjipedia.url)
    )

    $kanjipedia.prepend('<h2>Kanjipedia Explanation</h2>')
  }

  if (v.weblio) {
    const $weblio = $('<section class="weblio"></section>')
    $dialog.append($weblio)

    if ($.jStorage.get('questionType') === 'reading') {
      $('.weblio').css('display', 'none')
    }

    $weblio.html(v.weblio.html)
    $weblio.append($('<br>'))
    $weblio.append(
      $(
        '<a target="_blank" rel="noopener noreferrer">Click for full entries</a>'
      ).attr('href', v.weblio.url)
    )

    $weblio.prepend('<h2>Weblio Explanation</h2>')
  }
}

// @ts-ignore
try {
  $('.app-store-menu-item').remove()
  $(
    '<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>'
  ).insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")'))
  window.appStoreRegistry = window.appStoreRegistry || {}
  window.appStoreRegistry[GM_info.script.uuid] = GM_info
  localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry)
} catch (e) {}
