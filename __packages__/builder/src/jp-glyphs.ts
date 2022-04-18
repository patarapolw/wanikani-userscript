import { injectLangObserver } from './shared/inject-lang'

const DEFAULT_LANG = 'ja-JP'

let isInject = true

if (
  typeof location !== 'undefined' &&
  /[\./]youglish\.com$/.test(location.origin)
) {
  isInject = /japanese/.test(location.pathname)
}

if (isInject) {
  injectLangObserver(DEFAULT_LANG)
}
