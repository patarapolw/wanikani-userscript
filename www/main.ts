import './styles/main.scss'

import { makeCode } from '@/shared/code-block'
import { makeFurigana, normalizeFurigana } from '@/shared/furigana'
import { makeInlineMarkdown } from '@/shared/inline-markdown'
import { SegmentedParser } from '@/shared/segments'
import { checkSpoiler, makeDiscordSpoiler } from '@/shared/spoiler'
import MarkdownIt from 'markdown-it'

const elInput = document.querySelector('textarea')!
const elOutput = document.querySelector<HTMLDivElement>('.output')!
const elReverted = document.querySelector<HTMLQuoteElement>('.reverted')!

elInput.addEventListener('input', updateOutput)

const md = MarkdownIt({
  html: true
})

function updateOutput() {
  const format: string = 'html'

  const output = new SegmentedParser(elInput.value)
    .doParse(makeCode)
    .doParse(makeDiscordSpoiler)
    .doParse(makeFurigana)
    .doParse(makeInlineMarkdown)
    .render({
      'inline-markdown': (s) => {
        return s.includes('\n') ? md.render(s) : md.renderInline(s)
      }
    })

  if (format === 'markdown') {
    elOutput.innerText = output
  } else {
    elOutput.innerHTML = md.render(output)
  }

  elReverted.innerText = new SegmentedParser(output)
    .doParse(makeCode)
    .doParse(checkSpoiler)
    .doParse(normalizeFurigana)
    .render()
}

updateOutput()
