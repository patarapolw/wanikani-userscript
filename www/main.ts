import './styles/main.scss'

import { makeCode } from '@/shared/code-block'
import { makeDiscordSpoiler } from '@/shared/discord-spoiler'
import { makeParseFurigana } from '@/shared/furigana'
import Segments from '@/shared/segments'
import MarkdownIt from 'markdown-it'

const elInput = document.querySelector('textarea')!
const elOutput = document.querySelector('.output')!

elInput.addEventListener('input', updateOutput)

const md = MarkdownIt({
  html: true
})

function updateOutput() {
  elOutput.innerHTML = md.render(
    new Segments(elInput.value)
      .doParse(makeCode)
      .doParse(makeDiscordSpoiler)
      .doParse(makeParseFurigana((s) => md.renderInline(s)))
      .finalize({
        spoiler: (s) => `<span class="spoiler">${s}</span>`
      })
  )
}

updateOutput()
