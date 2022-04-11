import './styles/main.scss'

import { makeSpoiler } from '@/shared/discord-spoiler'

const elInput = document.querySelector('textarea')!
const elOutput = document.querySelector('.output')!

elInput.addEventListener('input', updateOutput)

function updateOutput() {
  elOutput.innerHTML = makeSpoiler(
    elInput.value,
    (s) => `<span class="spoiler">${s}</span>`
  )
}

updateOutput()
