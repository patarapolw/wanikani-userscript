(() => {
  // src/bb.ts
  function bbParser(md, convertBB) {
    let m;
    let s = md;
    const newMD = [];
    while (m = /\[([a-z]+)(.*?)\][^]+\[\/\1\]/.exec(s)) {
      newMD.push(s.substring(0, m.index));
      s = s.substring(m.index);
      const [, tag = ""] = m;
      let [, , meta = ""] = m;
      const openingTag = `[${tag}`;
      const closingTag = `[/${tag}]`;
      const offset = openingTag.length + meta.length + 1;
      let nextClose = s.indexOf(closingTag, offset);
      let nextOpen = s.indexOf(openingTag, offset);
      while (nextOpen >= 0 && nextOpen < nextClose) {
        const i = s.indexOf(closingTag, nextClose + 1);
        if (i < 0) {
          break;
        }
        nextClose = i;
        nextOpen = s.indexOf(openingTag, nextOpen + 1);
      }
      const content = s.substring(offset, nextClose);
      newMD.push(convertBB({ tag, meta, content }));
      s = s.substring(offset + content.length + closingTag.length);
    }
    if (newMD.length) {
      md = newMD.join("") + s;
    }
    return md;
  }
  Object.assign(window, { bbParser });
})();
