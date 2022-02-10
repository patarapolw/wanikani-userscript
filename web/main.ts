import { ExternalDefinition, IGetResult } from './lib/external-def'

const elLoading = document.getElementById('lds-ring-container')!

const elForm = document.querySelector('form')!
const elQ = elForm.querySelector('input[name="q"]') as HTMLInputElement
const elReading = elForm.querySelector(
  'input[name="reading"]'
) as HTMLInputElement
const elSource = elForm.querySelector(
  'select[name="source"]'
) as HTMLSelectElement

function hideReadingInput() {
  let parent = elReading.parentElement
  while (parent) {
    if (parent.classList.contains('field')) {
      break
    }
  }

  if (parent) {
    if (elSource.value === 'kanjipedia') {
      parent.classList.add('hidden')
    } else {
      parent.classList.remove('hidden')
    }
  }

  if (elSource.value === 'kanjipedia') {
    elQ.value = elQ.value.substring(0, 1)
  }
}

hideReadingInput()

elSource.addEventListener('change', () => {
  hideReadingInput()
})

function hideKanjiSource() {
  if (elQ.value.length > 1) {
    elSource.value = 'weblio'
  }
  hideReadingInput()
}

hideKanjiSource()

elQ.addEventListener('input', () => {
  hideKanjiSource()
})

function getSection(id: string) {
  const parent = document.querySelector(`.Output #${id}`)!

  return {
    parent,
    section: parent.querySelector('section')!,
    aBlank: parent.querySelector(
      'a[target="_blank"]:last-child'
    ) as HTMLAnchorElement
  }
}

const elOut: Record<string, ReturnType<typeof getSection>> = {
  kanjipedia: getSection('kanjipedia'),
  weblio: getSection('weblio'),
  alc: getSection('alc'),
  goo: getSection('goo')
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

const lookupMap = new Map<string, Record<string, IGetResult | null>>()
const extDef = new ExternalDefinition(scrape)

elForm.onsubmit = async (evt) => {
  evt.preventDefault()

  let q = elQ.value

  if (q) {
    const v = lookupMap.get(q) || {}
    if (typeof v[elSource.value] === 'undefined') {
      v[elSource.value] = null

      lookupMap.set(q, v)

      switch (elSource.value) {
        case 'kanjipedia':
          await extDef.kanjipedia(q).then((k) => (v.kanjipedia = k))
          break
        case 'weblio':
          await extDef.weblio(q).then((k) => (v.weblio = k))
      }

      lookupMap.set(q, v)
    }

    Object.values(elOut).map((v) => {
      v.parent.classList.add('hidden')
    })

    if (v[elSource.value]) {
      elOut[elSource.value].section.innerHTML = v[elSource.value]!.html
      elOut[elSource.value].aBlank.href = v[elSource.value]!.url
      elOut[elSource.value].parent.classList.remove('hidden')
    }
  }
}
