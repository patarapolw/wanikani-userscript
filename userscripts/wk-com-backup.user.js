// ==UserScript==
// @name         Discourse Thread Backup
// @namespace    polv
// @version      0.1
// @description  Backup a thread
// @author       polv
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=meta.discourse.org
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  async function backupThread(thread_id = 0, print = true) {
    if (typeof thread_id === 'boolean') {
      print = thread_id;
      thread_id = 0;
    }

    let thread_slug = '';
    let thread_title = '';

    if (!thread_id) {
      const [pid, tid, t] = location.href.split('/').reverse();
      if (isNaN(Number(tid))) {
        thread_slug = tid;
        thread_id = Number(pid);
      } else {
        thread_slug = t;
        thread_id = Number(tid);
      }
    }
    if (!thread_id) return;

    const output = [];

    let cursor = 0;
    while (true) {
      let nextCursor = cursor;

      const obj = await fetch(
        location.origin +
          '/t/-/' +
          thread_id +
          (cursor ? '/' + cursor : '') +
          '.json' +
          (print ? '?print=true' : ''),
      ).then((r) => r.json());

      if (!thread_slug) {
        thread_slug = obj.slug;
      }
      if (!thread_title) {
        thread_title = obj.unicode_title || obj.title;
      }

      obj.post_stream.posts.map((p) => {
        const { username, cooked, polls, post_number } = p;
        if (post_number > nextCursor) {
          nextCursor = post_number;

          const lines = [];
          lines.push(`#${post_number}: ${username}`);
          if (polls) {
            lines.push(
              `<details><summary>More Info</summary><pre>${JSON.stringify(
                { polls },
                (k, v) => {
                  if (k === 'id') return;
                  return v;
                },
                2,
              )}</pre></details>`,
            );
          }
          lines.push(`<div class="cooked">${cooked}</div>`);

          output.push(lines.join('\n'));
        }
      });

      if (cursor >= nextCursor) {
        break;
      }
      cursor = nextCursor;
    }

    if (!thread_slug) {
      thread_slug = String(thread_id);
    }

    const header = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => el.outerHTML)
      .join('\n');

    downloadText(
      [
        `<style>
        main {max-width: 1000px; margin: 0 auto;}
        .cooked {margin: 2em;}
        </style>'`,
        header,
        `<title>${thread_title}</title>`,
        `<h1>${thread_title}</h1>`,
        `<main>${output.join('\n\n<hr>\n\n')}</main>`,
      ].join('\n\n'),
      thread_slug + '.html',
    );
  }

  function downloadText(text, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  Object.assign(window, { backupThread });
})();
