import { injectLangHTML } from './shared/inject-lang';

// lang="ja" may also works.
let lang = 'ja-JP';
let isInject = true;

if (
  typeof location !== 'undefined' &&
  /[\./]youglish\.com$/.test(location.origin)
) {
  lang = 'ja-JP';
  isInject = /japanese/.test(location.pathname);

  if (!isInject) {
    lang = 'ko-KR';
    isInject = /korean/.test(location.pathname);
  }

  if (!isInject) {
    const m = /chinese(\/([a-z]{2}))?\?$/.exec(location.pathname);
    if (m) {
      lang = `zh-${(m[1] || 'CN').toLocaleUpperCase()}`;
      isInject = true;
    }
  }

  if (!isInject) {
    lang = 'zh-CN';
    isInject = /chinese/.test(location.pathname);
  }
}

if (isInject) {
  injectLangHTML(lang);
}
