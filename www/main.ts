import { ExternalDefinition, IGetResult } from './lib/external-def'

const elLoading = document.getElementById('lds-ring-container')!

const elForm = document.querySelector('form')!
const elQ = elForm.querySelector('input[name="q"]') as HTMLInputElement
const elSource = elForm.querySelector(
  'select[name="source"]'
) as HTMLSelectElement

function hideKanjiSource() {
  if (elQ.value.length > 1) {
    elSource.value = 'weblio'
  }
}

hideKanjiSource()

elQ.addEventListener('input', () => {
  hideKanjiSource()
})

const lookupMap: {
  [source: string]: {
    [entry: string]: IGetResult | null
  }
} = {
  kanjipedia: {},
  weblio: {},
  alc: {},
  goo: {}
}

function getSection(
  id: string,
  fetch: (v0: string, ...vs: string[]) => Promise<void>
) {
  const parent = document.querySelector(`.Output #${id}`)!

  return {
    parent,
    section: parent.querySelector('section')!,
    aBlank: parent.querySelector(
      'a[target="_blank"]:last-child'
    ) as HTMLAnchorElement,
    fetch
  }
}

const elOut: Record<string, ReturnType<typeof getSection>> = {
  kanjipedia: getSection('kanjipedia', async (v0, ...vs) => {
    const src = 'kanjipedia'
    let k = lookupMap[src][v0]

    if (typeof k === 'undefined') {
      lookupMap[src][v0] = null

      vs = [v0, ...vs]
      for (const v of vs) {
        if (v.length === 1) {
          k = await extDef.kanjipedia(v)
          lookupMap[src][v0] = k
          if (k) {
            break
          }
        }
      }
    }

    if (k) {
      elOut[src].section.innerHTML = k.html
      elOut[src].aBlank.href = k.url
      elOut[src].parent.classList.remove('hidden')
    }
  }),
  weblio: getSection('weblio', async (v0, ...vs) => {
    const src = 'weblio'
    let k = lookupMap[src][v0]

    if (typeof k === 'undefined') {
      lookupMap[src][v0] = null

      vs = [v0, ...vs]
      for (const v of vs) {
        k = await extDef.weblio(v)
        lookupMap[src][v0] = k
        if (k) {
          break
        }
      }
    }

    if (k) {
      elOut[src].section.innerHTML = k.html
      elOut[src].aBlank.href = k.url
      elOut[src].parent.classList.remove('hidden')
    }
  }),
  alc: getSection('alc', async (v0, ...vs) => {
    const src = 'alc'
    let k = lookupMap[src][v0]

    if (typeof k === 'undefined') {
      lookupMap[src][v0] = null

      vs = [v0, ...vs]
      for (const _v of vs) {
        // k = await extDef.weblio(v)
        lookupMap[src][v0] = k
        if (k) {
          break
        }
      }
    }

    if (k) {
      elOut[src].section.innerHTML = k.html
      elOut[src].aBlank.href = k.url
      elOut[src].parent.classList.remove('hidden')
    }
  }),
  goo: getSection('goo', async (v0, ...vs) => {
    const src = 'goo'
    let k = lookupMap[src][v0]

    if (typeof k === 'undefined') {
      lookupMap[src][v0] = null

      vs = [v0, ...vs]
      for (const _v of vs) {
        // k = await extDef.weblio(v)
        lookupMap[src][v0] = k
        if (k) {
          break
        }
      }
    }

    if (k) {
      elOut[src].section.innerHTML = k.html
      elOut[src].aBlank.href = k.url
      elOut[src].parent.classList.remove('hidden')
    }
  })
}

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

const extDef = new ExternalDefinition(scrape)

elForm.onsubmit = async (evt) => {
  evt.preventDefault()

  const vs = elQ.value.split(' ')

  if (vs[0]) {
    Object.values(elOut).map((v) => {
      v.parent.classList.add('hidden')
    })

    if (elSource.value) {
      await elOut[elSource.value].fetch(vs[0], ...vs.slice(1))
    }
  }
}
