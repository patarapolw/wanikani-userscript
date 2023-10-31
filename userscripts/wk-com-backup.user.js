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

    let thread_name = String(thread_id);
    if (!thread_id) {
      const [pid, tid, t] = location.href.split('/').reverse();
      if (isNaN(Number(tid))) {
        thread_name = tid;
        thread_id = Number(pid);
      } else {
        thread_name = t;
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

      obj.post_stream.posts.map((p) => {
        const { username, cooked, polls, post_number } = p;
        if (post_number > nextCursor) {
          nextCursor = post_number;
          output.push(
            `<pre>${JSON.stringify(
              {
                username,
                post_number,
                polls,
              },
              (k, v) => {
                if (k === 'id') return;
                return v;
              },
              2,
            )}</pre>${cooked}`,
          );
        }
      });

      if (cursor >= nextCursor) {
        break;
      }
      cursor = nextCursor;
    }

    downloadText(output.join('\n<br><br>\n'), thread_name + '.html');
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
