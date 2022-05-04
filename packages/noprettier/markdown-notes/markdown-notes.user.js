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
    if (!location.pathname.match(/^\/(level|radical|kanji|vocabulary|(review\/extra_study)\/session)\//)) {
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
     * @returns {string}
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
                    })
                })
            }
        }
        return fetch(url).then((r) => r.text())
    }

    /**
    * Render the given markdown text.
    */
    function render(text) {
        // Do some custom replacements.
        text = text.replace(/#kan#/g, '<span class="kanji-highlight highlight-kanji" rel="tooltip" data-original-title="Kanji">');
        text = text.replace(/#\/kan#/g, '</span>');

        text = text.replace(/#rad#/g, '<span class="radical-highlight highlight-radical" rel="tooltip" data-original-title="Radical">');
        text = text.replace(/#\/rad#/g, '</span>');

        text = text.replace(/#read#/g, '<span class="reading-highlight highlight-reading" rel="tooltip" data-original-title="Reading">');
        text = text.replace(/#\/read#/g, '</span>');

        text = text.replace(/#voc#/g, '<span class="vocabulary-highlight highlight-vocabulary" rel="tooltip" data-original-title="Vocabulary">');
        text = text.replace(/#\/voc#/g, '</span>');

        // Render the rest as markdown.
        return converter.makeHtml(text);
    }

    /**
     * generate Random uuid Javascript
     *
     * @link https://stackoverflow.com/a/64597106/9023855
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
                    r = render(r);
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
        // Save the markdown and render the content.
        var html = note.html();
        if (typeof html === 'undefined') html = '';
        note.data('noteContent', html.replace(/<br>/g,'\n'));

        html = render(html);
        note.html(html);
        makeHtmlAsync(html).then((newHTML) => {
            html = newHTML;
            note.html(html);
        });

        activateTooltips(note);

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
                textarea.html(str);
                var interval = setInterval(function() {
                    // Keep waiting until there is no text area. Then, save the changed markdown
                    // value to the data. Also re-render the note.
                    if (note.find('textarea').length === 0) {
                        clearInterval(interval);
                        note.data('noteContent', note.html().replace(/<br>/g,'\n'));
                        note.html(render(note.html()));
                        activateTooltips(note);
                    }
                }, 50);
            }
        });
    }

    function main() {
        // Convert the text in the meaning note.
        var noteFields = ['.note-meaning', '.note-reading'];
        $.each(noteFields, function(i, noteSelector) {
            // During reviews, we have to wait for the field to be added to the dom first.
            // Then, we can add a listener to the note selector.
            $('#option-item-info').click(function() {
                var interval = setInterval(function() {
                    if ($(noteSelector).length !== 0) {
                        clearInterval(interval);
                        setupNoteField($(noteSelector));
                    }
                }, 50);
            });

            // Setup the note field if it is on the page already.
            setupNoteField($(noteSelector));
        });
    }

    // Run startup() after window.onload event.
    if (document.readyState === 'complete')
        main();
    else
        window.addEventListener("load", main, false);
})(wkmdnotes);
