import { injectLangObserver } from './shared/inject-lang'

let DEFAULT_LANG = 'ja-JP'

let isInject = true

if (
  typeof location !== 'undefined' &&
  /[\./]youglish\.com$/.test(location.origin)
) {
  isInject = /japanese/.test(location.pathname)

  if (!isInject) {
    DEFAULT_LANG = 'ko-KR'
    isInject = /korean/.test(location.pathname)
  }

  if (!isInject) {
    const m = /chinese(\/([a-z]{2}))?\?$/.exec(location.pathname)
    if (m) {
      DEFAULT_LANG = `zh-${(m[1] || 'CN').toLocaleUpperCase()}`
      isInject = true
    }
  }

  if (!isInject) {
    DEFAULT_LANG = 'zh-CN'
    isInject = /chinese/.test(location.pathname)
  }
}

if (isInject) {
  injectLangObserver(DEFAULT_LANG)
}
