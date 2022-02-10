import { ExternalDefinition, IGetResult } from './lib/external-def'

const elLoading = document.getElementById('lds-ring-container')!

const elForm = document.querySelector('form')!
const elQ = elForm.querySelector('input[name="q"]') as HTMLInputElement

function getSection(id: string) {
  const parent = document.querySelector(`#${id}`)!

  return {
    parent,
    section: parent.querySelector('section')!,
    aBlank: parent.querySelector(
      'a[target="_blank"]:last-child'
    ) as HTMLAnchorElement
  }
}

const elKanjipedia = getSection('kanjipedia')
const elWeblio = getSection('weblio')

async function scrape(url: string): Promise<string> {
  elLoading.classList.remove('hidden')

  return new Promise((resolve, reject) => {
    fetch(`/api/nocors?url=${encodeURIComponent(url)}`)
      .then((r) => r.text())
      .then(resolve)
      .catch(reject)
      .then(() => {
        elLoading.classList.add('hidden')
      })
  })
}

const lookupMap = new Map<
  string,
  Record<'kanjipedia' | 'weblio', IGetResult | null>
>()
const extDef = new ExternalDefinition(scrape)

elForm.onsubmit = async (evt) => {
  evt.preventDefault()

  let q = elQ.value

  if (q) {
    let v = lookupMap.get(q)
    if (!v) {
      v = { kanjipedia: null, weblio: null }

      lookupMap.set(q, v)
      await Promise.all([
        q.length === 1
          ? extDef.kanjipedia(q).then((k) => (v!.kanjipedia = k))
          : null,

        extDef.weblio(q).then((w) => (v!.weblio = w))
      ])
      lookupMap.set(q, v)
    }

    if (v.kanjipedia) {
      elKanjipedia.section.innerHTML = v.kanjipedia.html
      elKanjipedia.aBlank.href = v.kanjipedia.url
      elKanjipedia.parent.classList.remove('hidden')
    } else {
      elKanjipedia.parent.classList.add('hidden')
    }

    if (v.weblio) {
      elWeblio.section.innerHTML = v.weblio.html
      elWeblio.aBlank.href = v.weblio.url
      elWeblio.parent.classList.remove('hidden')
    } else {
      elWeblio.parent.classList.add('hidden')
    }
  }
}
