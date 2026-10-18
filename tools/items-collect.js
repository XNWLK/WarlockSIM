// Collects the Wowhead Forever item data for the gear builder. Runs in a browser tab on any www.wowhead.com/forever page
// (the item list pages only open in a real browser), in two steps:
//
//   1. Paste COLLECT (below) into that tab's console. It reads every list a Warlock's gear can come from (cloth per slot,
//      cloaks, necks, rings, trinkets, held-in-off-hand items, daggers, one-handed swords, staves, wands), keeps each item's
//      list entry and its stats, drops items for other classes only, and keeps the result in this tab's local storage
//      (key __wlx). It answers with the number of parts to send.
//   2. Start tools/items-receive.js (node), then for each part i = 0, 1, … paste SEND(i) into a wowhead.com tab: the tab
//      opens http://127.0.0.1:8799/save?… with that part, and the receiver writes it to research/raw/. After the last part
//      the receiver joins them into research/raw/forever-items.json, and SEND(-1) removes __wlx from the tab again.
//
// Then: node tools/gen-items.js (the list, and what is new / changed / gone) and tools/gen-item-icons.ps1 (new icons).
// A list page shows at most 1,000 items, so cloth is read slot by slot; COLLECT says how many each list had — a list at
// 1,000 has been cut off and needs splitting further.

const COLLECT = `(async () => {
  async function get(p) {
    const t = await (await fetch('/forever/items/' + p)).text();
    const b = t.indexOf('var listviewitems = '); let lv = [];
    if (b >= 0) { const s = t.indexOf('[', b); let d = 0, e = s; for (; e < t.length; e++) { const c = t[e]; if (c === '[') d++; else if (c === ']') { d--; if (!d) break; } } lv = Function('return ' + t.slice(s, e + 1))(); }
    const g = {}, re = /WH\\.Gatherer\\.addData\\(3, 16, /g; let m;
    while ((m = re.exec(t))) { const s = m.index + m[0].length; let d = 0, e = s; for (; e < t.length; e++) { const c = t[e]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } } Object.assign(g, JSON.parse(t.slice(s, e + 1))); }
    return { lv, g };
  }
  const cats = ['armor/cloth/slot:1', 'armor/cloth/slot:3', 'armor/cloth/slot:5', 'armor/cloth/slot:6', 'armor/cloth/slot:7', 'armor/cloth/slot:8', 'armor/cloth/slot:9',
    'armor/cloth/slot:10', 'armor/amulets', 'armor/rings', 'armor/trinkets', 'armor/cloaks', 'armor/miscellaneous', 'armor/off-hand-frills', 'weapons/daggers',
    'weapons/staves', 'weapons/one-handed-swords', 'weapons/wands'];
  const K = ['splpwr', 'spldmg', 'shasplpwr', 'firsplpwr', 'arcsplpwr', 'frosplpwr', 'holsplpwr', 'natsplpwr', 'splheal', 'hitrtng', 'critstrkrtng', 'splcritstrkpct',
    'hastertng', 'splpen', 'int', 'spi', 'sta', 'manargn', 'agi', 'str', 'atkpwr'];
  const items = {}, counts = {};
  for (const c of cats) {
    const { lv, g } = await get(c); counts[c] = lv.length;
    lv.forEach(x => {
      if (x.reqclass && !(x.reqclass & 256)) return;            // 256 = Warlock
      const gi = g[x.id] || {}, eq = gi.jsonequip || {}, s = {};
      K.forEach(k => { if (eq[k]) s[k] = eq[k]; });
      items[x.id] = { id: x.id, n: x.name, l: x.level, r: x.reqlevel || eq.reqlevel || 0, q: x.quality, sl: x.slotbak || x.slot, sub: x.subclass, cls: x.classs,
        ic: gi.icon || '', set: eq.itemset || 0, mx: eq.maxcount || 0, rc: x.reqclass || 0, rr: x.reqrace || 0, rf: eq.reqfaction || 0, s,
        src: x.source || [], sm: (x.sourcemore || []).map(m => ({ n: m.n, t: m.t, z: m.z, ti: m.ti })), cat: c };
    });
  }
  const txt = JSON.stringify({ collected: new Date().toISOString(), counts, items: Object.values(items) });
  localStorage.setItem('__wlx', encodeURIComponent(txt));
  return { items: Object.keys(items).length, counts, parts: Math.ceil(localStorage.getItem('__wlx').length / 480000) };
})()`;

// SEND(i): part i of the collected data to the local receiver; SEND(-1): forget the collected data in this tab.
const SEND = i => i < 0 ? `localStorage.removeItem('__wlx'); 'removed'` :
  `(() => { const e = localStorage.getItem('__wlx'), N = 480000, i = ${i}, n = Math.ceil(e.length / N);
    const at = x => x >= e.length ? e.length : e[x - 1] === '%' ? x - 1 : e[x - 2] === '%' ? x - 2 : x;   // never cut through a %XX
    setTimeout(() => { location.href = 'http://127.0.0.1:8799/save?name=forever-items.json&part=' + i + '&of=' + n + '&d=' + e.slice(at(i * N), at((i + 1) * N)); }, 50);
    return 'part ' + i + ' of ' + n; })()`;

module.exports = { COLLECT, SEND };
if (require.main === module) console.log(process.argv[2] === 'send' ? SEND(+process.argv[3]) : COLLECT);
