// ==UserScript==
// @name         Discourse Thread Backup
// @namespace    polv
// @version      0.2.2
// @description  Backup a thread
// @author       polv
// @match        *://community.wanikani.com/*
// @match        *://forums.learnnatively.com/*
// @license      MIT
// @supportURL   https://community.wanikani.com/t/a-way-to-backup-discourse-threads/63679/9
// @source       https://github.com/patarapolw/wanikani-userscript/blob/master/userscripts/wk-com-backup.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=meta.discourse.org
// @grant        none
// ==/UserScript==

// @ts-check
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
      const [pid, tid, slug] = location.pathname.split('/').reverse();
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

    const markBatch = 500;
    let lastMark = 0;

    while (true) {
      let nextCursor = cursor;

      const jsonURL =
        location.origin +
        '/t/-/' +
        thread_id +
        (cursor ? '/' + cursor : '') +
        '.json' +
        (x1000 ? '?print=true' : '');

      const obj = await fetch(jsonURL).then((r) => r.json());

      if (x1000) {
        // TODO: ?print=true is rate limited. Not sure for how long.
        x1000 = false;
        setTimeout(() => {
          fetch(jsonURL);
        }, 1 * 60 * 1000);
      }

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
          if (polls?.length) {
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
          lines.push(
            `<div class="cooked">${cooked.replace(
              /<img /g,
              '<img loading="lazy" ',
            )}</div>`,
          );

          output.push(lines.join('\n'));
        }
      });

      if (cursor >= nextCursor) {
        break;
      }

      if (cursor > (lastMark + 1) * markBatch) {
        lastMark = Math.floor(cursor / markBatch);
        console.log(cursor);
      }

      cursor = nextCursor;
    }

    const url =
      location.origin + '/t/' + (thread_slug || '-') + '/' + thread_id;

    console.log('Downloaded ' + url);

    if (!thread_slug) {
      thread_slug = String(thread_id);
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(
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
              Array.from(
                document.querySelectorAll(
                  'meta[charset], link[rel="icon"], link[rel="stylesheet"], style',
                ),
              )
                .map((el) => el.outerHTML)
                .join('\n'),
              `<title>${thread_title}</title>`,
            ],
            `</head>`,
            `<body>`,
            ...[
              `<h1>${thread_title}</h1>`,
              `<p><a href="${url}" target="_blank">${decodeURI(
                url,
              )}</a>・<a href="${url}.json" target="_blank">JSON</p>`,
              `<main>${output.join('\n<hr>\n')}</main>`,
            ],
            `</body>`,
          ],
          `</html>`,
        ],
        {
          type: 'text/html',
        },
      ),
    );
    a.download = decodeURIComponent(thread_slug) + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  Object.assign(window, { backupThread });
})();
