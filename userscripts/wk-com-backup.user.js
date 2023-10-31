// ==UserScript==
// @name         Discourse Thread Backup
// @namespace    polv
// @version      0.1
// @description  Backup a thread
// @author       polv
// @match        *://community.wanikani.com/*
// @match        *://forums.learnnatively.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=meta.discourse.org
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  async function backupThread(thread_id = 0, x1000 = false) {
    if (typeof thread_id === 'boolean') {
      x1000 = thread_id;
      thread_id = 0;
    }

    let thread_slug = '';
    let thread_title = '';

    if (!thread_id) {
      const [pid, tid, slug] = location.href.split('/').reverse();
      thread_id = Number(tid);
      if (!thread_id) {
        thread_slug = tid;
        thread_id = Number(pid);
      } else {
        thread_slug = slug;
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
          (x1000 ? '?print=true' : ''),
      ).then((r) => r.json());

      if (!thread_slug) {
        thread_slug = obj.slug;
      }
      if (!thread_title) {
        thread_title = obj.unicode_title || obj.title;
      }

      obj.post_stream.posts.map((p) => {
        const { username, cooked, polls, post_number, actions_summary } = p;
        if (post_number > nextCursor) {
          nextCursor = post_number;

          const lines = [];
          lines.push(
            `#${post_number}: ${username} ${actions_summary
              .filter((a) => a.count)
              .map((a) => `❤️ ${a.count}`)
              .join(', ')}`,
          );
          if (polls) {
            lines.push(
              `<details><summary>Poll results</summary>${polls
                .map((p) => {
                  const pre = document.createElement('pre');
                  pre.textContent = JSON.stringify(
                    p,
                    (k, v) => {
                      if (/^(avatar|assign)_/.test(k)) return;
                      if (v === null || v === '') return;
                      return v;
                    },
                    2,
                  );
                  return pre.outerHTML;
                })
                .join('')}</details>`,
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

    const url =
      location.origin + '/t/' + (thread_slug || '-') + '/' + thread_id;

    if (!thread_slug) {
      thread_slug = String(thread_id);
    }

    const header = Array.from(
      document.querySelectorAll(
        'link[rel="icon"], link[rel="stylesheet"], style',
      ),
    )
      .map((el) => el.outerHTML)
      .join('\n');

    downloadText(
      [
        `<html>`,
        ...[
          `<head>`,
          ...[
            `<style>
            main {max-width: 1000px; margin: 0 auto;}
            .cooked {margin: 2em;}
            .spoiler:not(:hover):not(:active) {filter:blur(5px);}
            </style>`,
            header,
            `<title>${thread_title}</title>`,
          ],
          `</head>`,
          `<body>`,
          ...[
            `<h1>${thread_title}</h1>`,
            `<a href="${url}">${decodeURI(url)}</a>`,
            `<main>${output.join('\n<hr>\n')}</main>`,
          ],
          `</body>`,
        ],
        `</html>`,
      ].join('\n'),
      decodeURIComponent(thread_slug) + '.html',
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
