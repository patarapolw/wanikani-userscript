import { parseJapanese } from '../js/external-def'

declare const appStoreRegistry: any
declare const GM_info: any
declare const GM_xmlhttpRequest: any

declare global {
  interface JQueryStatic {
    jStorage: any;
  }
}

let word = $('div#character').text().trim().replace(/する|〜/, '')
const url = document.URL

$.jStorage.listenKeyChange('currentItem', function () {
  word = $('div#character').text().trim().replace(/する|〜/, '')
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
  const { kanjipedia, kanjipediaUrl, weblio, weblioUrl } = await parseJapanese(word, scrape)
  if (kanjipedia.trim()) {
    if (url.indexOf('vocabulary') !== -1 || url.indexOf('kanji') !== -1 || url.indexOf('radical') !== -1) {
      $('<section class="kanjipedia"></section>').insertAfter('#information')
    }
    $('#item-info-col2').prepend('<section class="kanjipedia"></section>')
    if (url.indexOf('lesson') !== -1) {
      $('#supplement-kan-meaning .col2').prepend('<section class="kanjipedia"></section>')
      $('#supplement-voc-meaning .col2').prepend('<section class="kanjipedia"></section>')
      console.log('Prepended')
    } else {
      if ($.jStorage.get('questionType') === 'reading') $('.kanjipedia').css('display', 'none')
    }

    $('.kanjipedia').html(
      kanjipedia +
      '<br><a href="' + kanjipediaUrl + '" target="_blank">Click for full entries</a>')
    $('.kanjipedia').prepend('<h2>Kanjipedia Explanation</h2>')
  }

  if (weblio.length > 0) {
    if (url.indexOf('vocabulary') !== -1 || url.indexOf('kanji') !== -1 || url.indexOf('radical') !== -1) {
      $('<section class="weblio"></section>').insertAfter('#information')
    }

    $('#item-info-col2').prepend('<section class="weblio"></section>')

    if (url.indexOf('lesson') !== -1) {
      $('#supplement-kan-meaning .col2').prepend('<section class="weblio"></section>')
      $('#supplement-voc-meaning .col2').prepend('<section class="weblio"></section>')
      console.log('Prepended')
    } else {
      if ($.jStorage.get('questionType') === 'reading') $('.weblio').css('display', 'none')
    }

    weblio.html('')
    weblio.map((w: string) => {
      $('.weblio').append(w)
    })
    $('.weblio').append('<br><a href="' + weblioUrl + '" target="_blank">Click for full entries</a>')

    $('.weblio').prepend('<h2>Weblio Explanation</h2>')
  }
}

if (url.indexOf('vocabulary') !== -1 || url.indexOf('kanji') !== -1 || url.indexOf('radical') !== -1) {
  word = $('span.japanese-font-styling-correction:first').text().trim().replace(/する|〜/, '')
  updateInfo()
}

var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; ++i) {
    for (var j = 0; j < mutations[i].addedNodes.length; ++j) {
      const node = mutations[i].addedNodes[j] as HTMLElement
      if (node.id === 'item-info-meaning-mnemonic') {
        updateInfo()
      }
    }
  }
})
observer.observe($('#item-info-col2').get(0), { childList: true })

// setup observer to change kanji info box contents for subsequent items
var observer2 = new MutationObserver(function () {
  word = $('div#character').text().trim().replace(/する|〜/, '')
  $('.weblio').remove()
  $('.kanjipedia').remove()
  updateInfo()
})
observer2.observe($('div#character').get(0), { attributes: true, childList: true, characterData: true })

var observer3 = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; ++i) {
    for (var j = 0; j < mutations[i].addedNodes.length; ++j) {
      const node = mutations[i].addedNodes[j] as HTMLElement
      if (node.style.display === 'block') {
        $('.weblio').css('display', 'block')
        $('.kanjipedia').css('display', 'block')
      }
    }
  }
})
observer3.observe($('#item-info-meaning-mnemonic').get(0), { attributes: true })

// function nthIndex (str: string, pat: string, n: number) {
//   var L = str.length; var i = -1
//   while (n-- && i++ < L) {
//     i = str.indexOf(pat, i)
//     if (i < 0) break
//   }
//   return i
// }

// @ts-ignore
try { $('.app-store-menu-item').remove(); $('<li class="app-store-menu-item"><a href="https://community.wanikani.com/t/there-are-so-many-user-scripts-now-that-discovering-them-is-hard/20709">App Store</a></li>').insertBefore($('.navbar .dropdown-menu .nav-header:contains("Account")')); window.appStoreRegistry = window.appStoreRegistry || {}; window.appStoreRegistry[GM_info.script.uuid] = GM_info; localStorage.appStoreRegistry = JSON.stringify(appStoreRegistry) } catch (e) {}
