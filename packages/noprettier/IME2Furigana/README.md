## Change Logs

- 22 May 2022
  - The two new buttons can now be hidden
  - Furigana should be cleared when IME isn't active.
- 6 May 2022
  - Add label for Options
  - Add Option `CONVERT_ONLY_SPECIAL_MARKUP` - only exactly `<ruby lang = 'ja-JP'>` will be converted back to markup. Everything else including `<ruby>` will be ignored.
- 1 May 2022
  - Add Furigana detection for small Kana (ヵヶ).
- 29 Apr 2022
  - Force update textarea for [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) for Android (with [Violentmonkey](https://violentmonkey.github.io/)).
- 25 Apr 2022
  - Change `@name`, so that it can co-exist with the original script. Also, update `@description`.
- 24 Apr 2022
  - Add 々 to Kanji list (so that <ruby>久々<rt>ひさびさ</rt></ruby> works)
  - Add zero-width space [`\u200b`](https://unicode-explorer.com/c/200b) ,[`\u2060`](https://unicode-explorer.com/c/2060) support. Copy and paste the character just behind `<` (in `<>[]` or `<>{}`) to prevent conversion to `<ruby>` tags - <​振り仮名>[ふりがな]
    - I made it work to prevent `<ruby>` collapse as well, by putting the weird space just behind `<ruby>` - <ruby>​振り仮名<rt>ふりがな</rt></ruby>
  - Add a settings to turn off `CODE_BLOCK_DETECTION`, in case it fails.
- 12 Apr 2022
  - Don't autocollapse `<ruby>` tags (to `<>[]` / `<>{}`) on edit
    - It still will collapse on Initialization, on Paste, on Lose Focus (onblur), or on Save.
  - Don't collapse, if nested `<ruby>` tags (<ruby><ruby>危<rt>き</rt></ruby><ruby>険<rt>けん</rt></ruby><rt>、、</rt></ruby><ruby>な<rt> 、</rt></ruby><ruby><ruby>秘<rt>ひ</rt></ruby><ruby>密<rt>みつ</rt></ruby><rt>、、</rt></ruby><ruby>を<rt> 、</rt></ruby>) - https://community.wanikani.com/t/x/44555/13 (Admittedly, this is a temporary fix.)

```html
<ruby><ruby>危<rt>き</rt></ruby><ruby>険<rt>けん</rt></ruby><rt>、、</rt></ruby><ruby>な<rt> 、</rt></ruby><ruby><ruby>秘<rt>ひ</rt></ruby><ruby>密<rt>みつ</rt></ruby><rt>、、</rt></ruby><ruby>を<rt> 、</rt></ruby>
```

- 12 Apr 2012
  - Don't collapse exotic `<ruby>` tags - <ruby lang="zh-CN">你好<rt>ní hǎo</rt></ruby>
    - Normal `<ruby >` tags can also be prevented from collapsing by adding a single space - <ruby >振り仮名<rt>ふりがな</rt></ruby>
  - Restyle "blur" mode.
- 6 Apr 2022
  - Allow OFF_MODE to be disabled. Also, if OFF_MODE is disabled, the change-mode button won't be unnecesarily dimmed.
- 5 Apr 2022
  - Add code block detection, for both \` and \`\`\`.
  - Add "manual" mode - doesn't auto-insert Furigana, but Furigana can still be rendered.
  - Add two buttons, for inserting Furigana templates (`<>[]` / `<>{}`)
  - Restyle "auto" mode.
  - Default to `<span class="spoiler">`. The old `[spoiler]` can still be detected.
  - Add UserScript icon

<details>
<summary><IME>[アイ・エム・イー]2<振>{ふ}り<仮名>{がな}</summary>

This works `<おはよう>[Hello]` - <おはよう>[Hello].

This also works - `<ruby lang = 'ja-JP'>おはよう<rp>(</rp><rt>Hello</rt><rp>)</rp></ruby>`

```html
<ruby lang = 'ja-JP'>おはよう<rp>(</rp><rt>Hello</rt><rp>)</rp></ruby>
```
</details>
