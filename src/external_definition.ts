import * as $ from "cheerio";

interface IOutput {
    [key: string]: string | string[] | null;
}

interface IObject {
    [key: string]: any;
}

function fixUrl($$: CheerioStatic, baseUrl: string) {
    $$("a").each((i, el) => {
        $$(el).attr("href", new URL($$(el).attr("href"), baseUrl).href);
    });
    $$("img").each((i, el) => {
        $$(el).attr("src", new URL($$(el).attr("src"), baseUrl).href);
    });
}

async function parseJapanese(q: string, getFunction: (url: string) => Promise<string>) {
    let result = {} as IObject;
    if (q.length === 1) {
        result = await parseKanjipedia(q, getFunction);
    }

    const weblio = await parseWeblio(q, getFunction);
    
    result = {...result, weblio};

    return result;
}

async function parseKanjipedia(q: string, getFunction: (url: string) => Promise<string>) {
    const urlBase = "https://www.kanjipedia.jp/";
    let html: string = await getFunction(`${urlBase}search?k=${q}&kt=1&sk=leftHand`);

    const $$ = $.load(await getFunction(new URL($("#resultKanjiList", html).find("a").attr("href"), urlBase).href));
    fixUrl($$, urlBase)

    return {
        kanjipedia: $$("#kanjiRightSection").find("p").html(),
    };
}

async function parseWeblio(q: string, getFunction: (url: string) => Promise<string>) {
    const weblio = {} as IOutput;

    const $$ = $.load(await getFunction("https://www.weblio.jp/content/" + q));
    fixUrl($$, "https://www.weblio.jp");

    weblio.vocab = $$(".NetDicBody").toArray().map((el) => $$(el).html() || "").filter((el) => el !== "");

    if (q.length === 1) {
        weblio.kanji = $$(`[title=${q}]`).toArray().map((el) => {
            return $$(el).parent(".NetDicHead").next(".NetDicBody").html() || "";
        }).filter((el) => el !== "");
    }

    console.log(weblio.vocab)

    return weblio;
}

export { parseJapanese };
(window as any).external_definition = { parseJapanese };
