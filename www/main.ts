import './styles/main.scss'

import { makeCode } from '@/shared/code-block'
import { makeDiscordSpoiler } from '@/shared/discord-spoiler'
import { makeParseFurigana } from '@/shared/furigana'
import SegmentedParser from '@/shared/segments'
import MarkdownIt from 'markdown-it'

const elInput = document.querySelector('textarea')!
const elOutput = document.querySelector<HTMLDivElement>('.output')!

elInput.addEventListener('input', updateOutput)

const md = MarkdownIt({
  html: true
})

function updateOutput() {
  const format: string = 'html'

  const output = new SegmentedParser(elInput.value, (s) => {
    // const html = md.render(s)
    // let minified = html.trim()
    // const op = '<p>'
    // const ed = '</p>'
    // if (
    //   minified.startsWith(op) &&
    //   minified.indexOf(ed) === minified.length - ed.length
    // ) {
    //   return minified.substring(op.length, minified.length - ed.length)
    // }

    // return html
    return s.includes('\n') ? md.render(s) : md.renderInline(s)
  })
    .doParse(makeCode)
    .doParse(makeDiscordSpoiler)
    .doParse(makeParseFurigana)
    .render({
      spoiler: (s, fn) => {
        const tag = s.includes('\n') ? 'div' : 'span'
        return `<${tag} class="spoiler">${fn(s)}</${tag}>`
      }
    })

  if (format === 'markdown') {
    elOutput.innerText = output.markdown
  } else {
    elOutput.innerHTML = output.html()
  }
}

updateOutput()
