// ==UserScript==
// @name         Discourse Thread Backup
// @namespace    polv
// @version      0.2
// @description  Backup a thread
// @author       polv
// @match        *://community.wanikani.com/*
// @match        *://forums.learnnatively.com/*
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

    const main = document.createElement('main');

    let cursor = 0;
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

          const section = document.createElement('section');
          main.append(section);

          section.append(
            ((p) => {
              p.innerText = `#${post_number}: ${username} ${actions_summary
                .filter((a) => a.count)
                .map((a) => `❤️ ${a.count}`)
                .join(', ')}`;

              return p;
            })(document.createElement('p')),
          );

          if (polls?.length) {
            const details = document.createElement('details');
            section.append(details);

            const summary = document.createElement('summary');
            summary.innerText = 'Polls results';
            details.append(summary);

            polls.map((p) => {
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
              details.append(p);
            });
          }

          section.append(
            ((div) => {
              div.className = 'cooked';
              div.innerHTML = cooked;
              return div;
            })(document.createElement('div')),
          );
        }
      });

      if (cursor >= nextCursor) {
        break;
      }
      cursor = nextCursor;
    }

    main.querySelectorAll('img').forEach((img) => {
      img.loading = 'lazy';
    });

    const url =
      location.origin + '/t/' + (thread_slug || '-') + '/' + thread_id;

    if (!thread_slug) {
      thread_slug = String(thread_id);
    }

    const html = document.createElement('html');

    const head = document.createElement('head');
    html.append(head);

    head.append(
      ...Array.from(
        document.querySelectorAll(
          'meta[charset], link[rel="icon"], link[rel="stylesheet"], style',
        ),
      ).map((el) => el.cloneNode(true)),
      ((el) => {
        el.innerText = thread_title;
        return el;
      })(document.createElement('title')),
      ((el) => {
        el.textContent = /* css */ `
        main {max-width: 1000px; margin: 0 auto;}
        .cooked {margin: 2em;}
        .spoiler:not(:hover):not(:active) {filter:blur(5px);}
        `;
        return el;
      })(document.createElement('style')),
    );

    const body = document.createElement('body');
    html.append(body);

    body.append(
      ((el) => {
        el.innerText = thread_title;
        return el;
      })(document.createElement('h1')),
      ((el) => {
        const a1 = document.createElement('a');
        el.append(a1);
        a1.href = url;
        a1.innerText = decodeURI(url);

        const span = document.createElement('span');
        el.append(span);
        span.innerText = '・';

        const a2 = document.createElement('a');
        el.append(a2);
        a2.href = url + '.json';
        a2.innerText = 'JSON';

        return el;
      })(document.createElement('p')),
      main,
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([html.outerHTML], {
        type: 'text/html',
      }),
    );
    a.download = decodeURIComponent(thread_slug) + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();

    html.remove();
  }

  Object.assign(window, { backupThread });
})();
