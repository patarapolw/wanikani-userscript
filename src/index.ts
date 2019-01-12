function getFunction(url: string): Promise<string> {
    const elLdsRingContainer = document.getElementById("lds-ring-container")!;
    elLdsRingContainer.style.display = "block";

    return new Promise((resolve, reject) => {
        fetch("https://cors-anywhere.herokuapp.com/" + url, {
            mode: "cors",
        })
        .then((r) => r.text())
        .then(resolve)
        .catch(reject)
        .then(() => {
            elLdsRingContainer.style.display = "none";
        })
    })
}

document.getElementById("searchQ")!.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        const form = document.getElementById("searchForm")!;
        const q = Object.values(form).reduce((obj, field) => {
            obj[field.name] = field.value;
            return obj
        }, {});

        (window as any).external_definition.parseJapanese(q.q, getFunction).then((r: any) => {
            document.getElementById("kanjipedia")!.innerHTML = r.kanjipedia || "";

            const kanjipediaUrlEl = document.getElementById("kanjipedia-url") as HTMLAnchorElement;
            if (r.kanjipediaUrl !== undefined) {
                kanjipediaUrlEl.href = r.kanjipediaUrl;
                kanjipediaUrlEl.style.display = "block";
            } else {
                kanjipediaUrlEl.style.display = "none";
            }

            const elWeblioVocab = document.getElementById("weblio-vocab")!;
            elWeblioVocab.innerHTML = "";
            r.weblio.vocab.forEach((el: string) => {
                elWeblioVocab.innerHTML += el;
            });

            const elWeblioKanji = document.getElementById("weblio-kanji")!;
            elWeblioKanji.innerHTML = "";
            r.weblio.kanji.forEach((el: string) => {
                elWeblioKanji.innerHTML += el;
            });
        })
    }
});