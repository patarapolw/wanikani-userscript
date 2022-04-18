import { injectLangObserver } from './shared/inject-lang'

const DEFAULT_LANG = 'ja-JP'

let lang = DEFAULT_LANG
let isInject = true

if (
  typeof location !== 'undefined' &&
  /[\./]youglish\.com$/.test(location.origin)
) {
  isInject = /japanese/.test(location.pathname)

  if (!isInject) {
    lang = 'ko-KR'
    isInject = /korean/.test(location.pathname)
  }

  if (!isInject) {
    const m = /chinese(\/([a-z]{2}))?\?$/.exec(location.pathname)
    if (m) {
      lang = `zh-${(m[1] || 'CN').toLocaleUpperCase()}`
      isInject = true
    }
  }

  if (!isInject) {
    lang = 'zh-CN'
    isInject = /chinese/.test(location.pathname)
  }
}

if (isInject) {
  injectLangObserver(lang)
}
