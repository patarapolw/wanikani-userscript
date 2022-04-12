## Change Logs

- 12 Apr 2022
  - Don't autocollapse `<ruby>` tags (to `<>[]` / `<>{}`) on edit
    - It still will collapse on Initialization and on Paste.
  - Don't collapse, if nested `<ruby>` tags (<ruby><ruby>危<rt>き</rt></ruby><ruby>険<rt>けん</rt></ruby><rt>、、</rt></ruby><ruby>な<rt> 、</rt></ruby><ruby><ruby>秘<rt>ひ</rt></ruby><ruby>密<rt>みつ</rt></ruby><rt>、、</rt></ruby><ruby>を<rt> 、</rt></ruby>) - https://community.wanikani.com/t/x/44555/13 (Admittedly, this is a temporary fix.)
  - Don't collapse exotic `<ruby>` tags - <ruby lang="zh-CN">你好<rt>ní hǎo</rt></ruby>
    - Normal `<ruby >` tags can also be prevented from collapsing by adding a single space - <ruby >振り仮名<rt>ふりがな</rt></ruby>
  - Restyle "blur" mode.

```
<ruby><ruby>危<rt>き</rt></ruby><ruby>険<rt>けん</rt></ruby><rt>、、</rt></ruby><ruby>な<rt> 、</rt></ruby><ruby><ruby>秘<rt>ひ</rt></ruby><ruby>密<rt>みつ</rt></ruby><rt>、、</rt></ruby><ruby>を<rt> 、</rt></ruby>
```

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

```
<ruby lang = 'ja-JP'>おはよう<rp>(</rp><rt>Hello</rt><rp>)</rp></ruby>
```
</details>
