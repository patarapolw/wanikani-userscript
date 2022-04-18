# WaniKani Userscript

A GitHub source for `polv`'s userscripts.

## List of built UserScripts

See [/lib/**/*.user.js](/lib).

There are also some raw JavaScript:-

- Forked [IME2Furigana](/__packages__/noprettier/IME2Furigana)

## Techniques

Userscripts are made from [multiple files' TypeScript](/__packages__/builder/src/forum-details-open.ts#L1), bundled together with [esbuild](https://esbuild.github.io/). Also, packages from NPM can be used.

Coindentally, [Vite](https://vitejs.dev/) comes together with esbuild, which can become useful when I need to test something on a real `localhost` website first.

The code is automatically [built](/__packages__/builder/scripts/bundle.ts#L11) to JavaScript [when commited](/.husky/pre-commit) to Github, so [the latest code is here](https://github.com/patarapolw/wanikani-userscript/blob/master/lib/forum-details-open.user.js). Somehow, even after being built / bundled, the code is still very readable! :open_book: :boom:

Because of the multiple files' TypeScript thing, [a portion of IME2Furigana code is here.](/__packages__/builder/src/shared/discourse.ts) I don't really know how `window.require()` of a Discourse Forum works, however; just copied everything. :grin:
