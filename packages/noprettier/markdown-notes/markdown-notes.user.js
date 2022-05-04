// ==UserScript==
// @name         WaniKani Markdown Notes (modified by polv)
// @namespace    rfindley
// @description  Allows you to write Markdown in the notes, which will be rendered as HTML when the page loads.
// @version      1.4plus
// @require      https://cdn.jsdelivr.net/npm/showdown/dist/showdown.min.js
// @match        *://www.wanikani.com/*
// @match        *://preview.wanikani.com/*
// @copyright    2013, Jeshua
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// ==/UserScript==

wkmdnotes = {};

(function() {
    if (!/^\/(level|radical|kanji|vocabulary|(review|extra_study)\/session)(\/|$)/.test(location.pathname)) {
        return;
    }

    const converter = new showdown.Converter({
        parseImgDimensions: true,
        strikethrough: true,
        tables: true,
        disableForced4SpacesIndentedSublists: true,
        backslashEscapesHTMLTags: true,
        emoji: true,
    });

    /**
     * Fetch that can bypass CORS. Always return string
     * @returns {Promise<string>}
     */
    async function fetchText(url) {
        const corsList = [
            'https://community.wanikani.com'
        ];

        for (let origin of corsList) {
            if (!origin.endsWith('/')) {
                origin += '/';
            }
            if (url.startsWith(origin)) {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url,
                        onload({ responseText }) {
                            resolve(responseText);
                        },
                        onerror: reject
                    });
                });
            }
        }
        return fetch(url).then((r) => {
            if (!r.ok) {
                throw r;
            }
            return r.text();
        });
    }

    /**
    * Markdown to HTML
    * @param {string} text
    * @param {object} [opts={}]
    * @param {boolean} [opts.singleLine]
    */
    function md2html(text, opts = {}) {
        // Do some custom replacements.
        text = text.replace(/#kan#/g, '<span class="kanji-highlight highlight-kanji" rel="tooltip" data-original-title="Kanji">');
        text = text.replace(/#\/kan#/g, '</span>');

        text = text.replace(/#rad#/g, '<span class="radical-highlight highlight-radical" rel="tooltip" data-original-title="Radical">');
        text = text.replace(/#\/rad#/g, '</span>');

        text = text.replace(/#read#/g, '<span class="reading-highlight highlight-reading" rel="tooltip" data-original-title="Reading">');
        text = text.replace(/#\/read#/g, '</span>');

        text = text.replace(/#voc#/g, '<span class="vocabulary-highlight highlight-vocabulary" rel="tooltip" data-original-title="Vocabulary">');
        text = text.replace(/#\/voc#/g, '</span>');

        // markdown-it-furigana
        text = text.replace(/\[(.+?)\]{(.+?)}/g, (...m) => {
            return parseList(
                bracketMatcher(m[0], [
                    { name: 'base', on: '[', off: ']' },
                    { name: 'furigana', on: '{', off: '}' }
                ]),
                'base',
                'furigana',
                makeFurigana
            )
        });

        // IME2Furigana normal
        // IME2Furigana spoiler
        // Doesn't work yet, because of <>

        // Render the rest as markdown.
        text = converter.makeHtml(text);

        if (opts.singleLine) {
            const op = '<p>';
            const ed = '</p>';
            if (text.startsWith(op) && text.endsWith(ed)) {
                const cleaned = text.substring(op.length, text.length - ed.length);
                if (!cleaned.includes(ed) && !cleaned.includes(op)) {
                    return cleaned;
                }
            }
        }


        return text;
    }

    /**
     * generate Random uuid Javascript
     *
     * @link https://stackoverflow.com/a/64597106/9023855
     * @returns {string}
     */
    function uuid() {
        if (typeof crypto !== 'undefined') {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
        return 'xxxx-xxxx-xxx-xxxx'.replace(/[x]/g, (c) => {
            const r = Math.floor(Math.random() * 16);
            return r.toString(16);
        });
    }

    /**
     * Parse {{keyword}} style template, and fetch external resources
     *
     * @param {string} html
     * @returns {Promise<string>}
     */
    async function makeHtmlAsync(html) {
        const asyncMap = {};
        html = html.replace(/{{(.+?)}}/g, (_, p1) => {
            const id = asyncMap[p1] || `{{${uuid()}}}`;
            asyncMap[p1] = id;
            return id;
        });

        const tags = [
            'community:'
        ];

        await Promise.all(Object.entries(asyncMap).map(async ([p1, id]) => {
            let html = p1;

            for (const tag of tags) {
                if (p1.startsWith(tag)) {
                    p1 = p1.substring(tag.length);

                    switch (tag) {
                        case 'community:': {
                            const [pid, rep = '1'] = p1.split('/');

                            await fetchText(`https://community.wanikani.com/t/${p1}.json`).then((r) => {
                                html = JSON.parse(r).post_stream.posts.find((p) => p.post_number === Number(rep)).cooked;
                            }).catch((e) => console.error(e));

                            return { id, html };
                        }
                    }
                }
            }

            await fetchText(p1).then((r) => {
                if (p1.endsWith('.md')) {
                    r = md2html(r);
                }
                html = r;
            }).catch((e) => console.error(e));

            return { id, html };
        })).then((rs) => rs.map(({ id, html: newHTML }) => {
            html = html.replaceAll(id, newHTML);
        }));

        return html;
    }

    /**
    * Find all of the tooltips in the given container and tooltipify them.
    */
    function activateTooltips(container) {
        if (container.tooltip) {
            container.find('span[rel="tooltip"]').tooltip();
        }
    }

    /**
    * Setup the given note field with the required callbacks.
    */
    function setupNoteField(note) {
        const doSetup = (val) => {
            // Save the markdown and render the content.
            var html = note.html() || '';
            note.data('noteContent', typeof val !== 'undefined' ? val : html.replace(/<br>/g,'\n'));

            html = md2html(html);
            note.html(html);
            makeHtmlAsync(html).then((newHTML) => {
                html = newHTML;
                note.html(html);
            });

            activateTooltips(note);
        };
        doSetup();

        note.click(function(e) {
            if (e.target.tagName.toLowerCase() === 'textarea') {
                return;
            }

            // If the target is the div, they are going from display --> edit.
            if (e.target.tagName.toLowerCase() !== 'button') {
                var interval = setInterval(function() {
                    // If we can find a textarea, they must have clicked to edit the text field.
                    // So, we want to display the markdown content.
                    if (note.find('textarea')) {
                        clearInterval(interval);
                        if (note.data('noteContent') === 'Click to add note') {
                            note.find('textarea').val('');
                        } else {
                            note.find('textarea').val(note.data('noteContent'));
                        }
                    }
                }, 50);
            }

            // Otherwise, they are going from edit --> display.
            else {
                var textarea = note.find('textarea');
                var str = textarea.val().replace(/\n/g,'\n');
                var interval = setInterval(function() {
                    // Keep waiting until there is no text area. Then, save the changed markdown
                    // value to the data. Also re-render the note.
                    if (note.find('textarea').length === 0) {
                        clearInterval(interval);
                        doSetup(str);
                    }
                }, 50);
            }
        });
    }

    function main() {
        // Convert the text in the meaning note.
        var noteFields = ['.note-meaning', '.note-reading'];
        noteFields.map((noteSelector) => {
            // Setup the note field if it is on the page already.
            setupNoteField($(noteSelector));
        });

        // During reviews, we have to wait for the field to be added to the dom first.
        // Then, we can add a listener to the note selector.
        const obs = new MutationObserver((muts) => {
            muts.map((m) => {
                m.addedNodes.forEach((n) => {
                    noteFields.map((sel) => {
                        if (n instanceof HTMLElement) {
                            if (n.matches(sel)) {
                                return setupNoteField($(sel));
                            }
                            return setupNoteField($(n.querySelector(sel)));
                        }
                    })
                })
            })
        })

        obs.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    $(main);

    /**
     * Bracket matcher is pretty much 大変, but it works.
     * Also, staggering Furigana, like [[good]{bad}]{maybe}.
     */

    function bracketMatcher(raw, bTypes) {
        let s = ''
        let type

        const rt = []
        const brackets = []

        const onMap = Object.fromEntries(bTypes.map((v) => [v.on, v]))
        const offMap = Object.fromEntries(bTypes.map((v) => [v.off, v]))

        raw.split('').map((c) => {
            let b

            if ((b = onMap[c])) {
                if (!type && s) {
                    rt.push({ s, b: type })
                    s = ''
                }

                type = type || b

                if (type && type.name === b.name) {
                    brackets.push(type.name)
                    s += c
                    return
                }
            }

            s += c

            if ((b = offMap[c])) {
                if (brackets[brackets.length - 1] === b.name) {
                    brackets.pop()
                    if (!brackets.length) {
                    rt.push({ s, b })
                    s = ''
                    type = undefined
                    }
                    return
                }
            }
        })

        if (s) {
            rt.push({ s, b: type })
        }

        return rt
    }

    function parseList(
        rt,
        type1,
        type2,
        parser
    ) {
        let out = ''
        for (let i = 0; i < rt.length; i++) {
            const { s, b } = rt[i]

            if (b?.name === type1 && rt[i + 1] && rt[i + 1]?.b?.name === type2) {
                const s1 = rt[i + 1].s
                out += parser(
                    s.substring(1, s.length - 1),
                    s1.substring(1, s1.length - 1)
                )
                i++
                continue
            }
            out += s
        }

        return out
    }

    function makeFurigana(base, ruby) {
        const reJaChar = /[\p{sc=Han}\p{sc=Katakana}\p{sc=Hiragana}]/gu

        if (ruby === '*' && reJaChar.test(base)) {
            return base
            .split(reJaChar)
            .map((s, i) =>
                i % 2
                ? s
                    .split('')
                    .map(
                        (c) =>
                        `<ruby><rp> </rp>${c}<rp>[</rp><rt>●</rt><rp>]</rp></ruby>`
                    )
                : s
            )
            .join('')
        }

        return `<ruby><rp> </rp>${md2html(base, { singleLine: true })}<rp>[</rp><rt>${md2html(
            ruby, { singleLine: true }
        )}</rt><rp>]</rp></ruby>`
    }
})(wkmdnotes);
