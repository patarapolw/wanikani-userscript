import { ExternalDefinition } from '../shared/deprecated/x-def'

declare function GM_xmlhttpRequest(params: {
  method: string
  url: string
  onload(data: { responseText: string }): void
  onerror(e: any): void
}): void

declare const GM_info: any

if (!document.querySelector('style[data-userscript-polv="external-def"]')) {
  const style = document.createElement('style')
  style.setAttribute('data-userscript-polv', 'external-def')
  style.textContent = `@import url("https://cdn.jsdelivr.net/gh/patarapolw/wanikani-userscript@1.1.1/css/kanjipedia.css");`
  document.head.append(style)
}

export function scrape(url: string) {
  return new Promise<string>(function (resolve, reject) {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (data) {
        resolve(data.responseText)
      },
      onerror: reject
    })
  })
}

const lookupMap = new Map()
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

async function updateInfo() {
  const word = (() => {
    const m = /wanikani\.com\/(?:kanji|vocabulary)\/(.+)$/.exec(location.href)
    if (m) {
      return decodeURIComponent(m[1].replace(/する$/, ''))
    }

    const it = $.jStorage.get<{ kan?: string; voc: string }>('currentItem')
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
    ))
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

try {
  $('.app-store-menu-item').remove()
  $(
    '<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>'
  ).insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")'))
  window.appStoreRegistry = window.appStoreRegistry || {}
  window.appStoreRegistry[GM_info.script.uuid] = GM_info
  localStorage.appStoreRegistry = JSON.stringify(window.appStoreRegistry)
} catch (e) {}
