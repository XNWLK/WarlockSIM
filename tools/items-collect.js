// Collects the Wowhead Forever item and enchant data for the gear builder. Runs in a browser tab on any
// www.wowhead.com/forever page (those pages only open in a real browser).
//
// THE SHORT WAY (round 166): run `node tools/items-sync.js`, paste what it prints into the console of a
// www.wowhead.com/forever tab, wait. When COLLECT is done it packs the data (gzip) and the tab jumps to the local
// receiver by itself; items-sync.js saves it, rebuilds data/item-db.js and lists what is new, gone or changed.
// (A Wowhead tab cannot post to 127.0.0.1 — its fetch is refused — and popups are blocked, so the data travels in the
// address of that one jump; packed it fits. If it does not, the tab says so and SEND(i) sends it in parts.)
//
// The older two steps, still possible:
//
//   1. Paste COLLECT (below) into that tab's console. It takes about 10 minutes: it pauses between requests, and waits a
//      minute whenever Wowhead refuses one (it does when asked too fast). It reads
//      - every item list a Warlock's gear can come from (cloth per slot, cloaks, necks, rings, trinkets, held-in-off-hand
//        items, daggers, one-handed swords, staves, wands): each item's list entry and its stats, without items that name
//        other classes only;
//      - the item sets (which class each set is for: a set piece of another class's set cannot be worn by a Warlock);
//      - every enchant: the Enchanting recipes ("Enchant …") and the permanent item enhancements (armor kits, arcanums, …),
//        each with its game enchant id and name from the spell page and its text;
//      and keeps the result in this tab's local storage (key __wlx). What it read from spell pages and tooltips is also
//      kept (key __wlx_cache), so a run that had to stop does not read it again. It answers with the number of parts.
//   2. Start tools/items-receive.js (node), then for each part i = 0, 1, … paste SEND(i) into a wowhead.com tab: the tab
//      opens http://127.0.0.1:8799/save?… with that part, and the receiver writes it to research/raw/. After the last part
//      the receiver joins them into research/raw/forever-items.json; SEND(-1) then removes __wlx and __wlx_cache again.
//
// Then: node tools/gen-items.js (items and enchants, and what is new / changed / gone) and tools/gen-item-icons.ps1.
// A list page shows at most 1,000 entries, so cloth is read slot by slot; COLLECT says how many each list had — a list at
// 1,000 has been cut off and needs splitting further.

const COLLECT = `(async () => {
  if (!/(^|\\.)wowhead\\.com$/.test(location.hostname)) throw new Error("run this in a www.wowhead.com/forever tab");   // round 166: nowhere else
  function arr(t, from) { const s = t.indexOf('[', from); let d = 0, e = s; for (; e < t.length; e++) { const c = t[e]; if (c === '[') d++; else if (c === ']') { d--; if (!d) break; } } return Function('return ' + t.slice(s, e + 1))(); }
  const pause = ms => new Promise(r => setTimeout(r, ms));
  async function page(p) {                                         // refused (403): wait a minute and try again, up to 5 times
    for (let k = 0; ; k++) {
      await pause(700); const r = await fetch(p);
      if (r.status !== 403) return r.text();
      if (k >= 5) throw new Error('Wowhead keeps refusing ' + p + ': wait a while and run COLLECT again (what was read is kept)');
      await pause(60000);
    }
  }
  let cache = {}; try { cache = JSON.parse(localStorage.getItem('__wlx_cache') || '{}'); } catch (e) { cache = {}; }
  const keep = () => { try { localStorage.setItem('__wlx_cache', JSON.stringify(cache)); } catch (e) { /* storage full: no cache */ } };
  async function get(p) {
    const t = await page('/forever/items/' + p), b = t.indexOf('var listviewitems = '), lv = b >= 0 ? arr(t, b) : [];
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
  async function tipText(itemId) {                               // round 166: a trinket's whole tooltip as text, spell links kept as [spell:ID]
    if (cache['t' + itemId]) return cache['t' + itemId];
    let tip = null;
    for (let k = 0; k < 3 && !tip; k++) { await pause(700); try { tip = await (await fetch('https://nether.wowhead.com/tooltip/item/' + itemId + '?dataEnv=16&locale=0')).json(); } catch (e) { await pause(30000); } }
    if (!tip) return '';
    const t = (tip.tooltip || '').replace(/<a[^>]*spell=(\\d+)[^>]*>/g, '[spell:$1]').replace(/<br\\s*\\/?>/gi, '\\n').replace(/<\\/(?:div|td|tr|table|span)>/gi, '\\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\\n\\s*\\n+/g, '\\n').trim();
    cache['t' + itemId] = t; keep(); return t;
  }
  for (const c of cats) {
    const { lv, g } = await get(c); counts[c] = lv.length;
    lv.forEach(x => {
      if (x.reqclass && !(x.reqclass & 256)) return;            // 256 = Warlock
      const gi = g[x.id] || {}, eq = gi.jsonequip || {}, s = {};
      K.forEach(k => { if (eq[k]) s[k] = eq[k]; });
      items[x.id] = { id: x.id, n: x.name, l: x.level, r: x.reqlevel || eq.reqlevel || 0, q: x.quality, sl: x.slotbak || x.slot, sub: x.subclass, cls: x.classs,
        ic: gi.icon || '', set: eq.itemset || 0, mx: eq.maxcount || 0, rc: x.reqclass || 0, rr: x.reqrace || 0, rf: eq.reqfaction || 0, s,
        src: x.source || [], sm: (x.sourcemore || []).map(m => ({ n: m.n, t: m.t, z: m.z, c: m.c, ti: m.ti })), cat: c };   // c: a quest's zone
    });
  }
  counts.trinketTips = 0;
  for (const id of Object.keys(items)) if (items[id].cat === 'armor/trinkets') { items[id].tt = await tipText(id); counts.trinketTips++; }
  // item sets: which class each is for
  const st = await page('/forever/item-sets'), sb = st.indexOf('var itemSets = ');
  const sets = (sb >= 0 ? arr(st, sb) : []).map(x => ({ id: x.id, n: x.name, rc: x.reqclass || 0, p: x.pieces || [] }));
  counts.sets = sets.length;
  // enchants: the spell page names the enchant ("Enchant Item: <name> (<enchant id>)"); temporary enchants are left out
  async function enchOf(spellId) {
    if (cache['s' + spellId]) return cache['s' + spellId];
    const t = await page('/forever/spell=' + spellId);
    const ef = [...t.matchAll(/Enchant Item: (?:<a[^>]*>)?<span[^>]*>([^<]*)<\\/span>(?:<\\/a>)?&nbsp;\\((\\d+)\\)/g)].map(x => ({ id: +x[2], n: x[1] }));
    const desc = (t.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const ic = (t.match(/WH\\.Gatherer\\.addData\\(6, 16, \\{"\\d+":\\{[^}]*"icon":"([^"]+)"/) || [])[1] || '';
    cache['s' + spellId] = { ef, desc: desc.replace(/ In the Profession Spells category\\..*$/, '').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"'), ic };
    keep(); return cache['s' + spellId];
  }
  async function tipOf(itemId) {                                  // the item's tooltip: its use spell and icon
    if (cache['i' + itemId]) return cache['i' + itemId];
    let tip = null;
    for (let k = 0; k < 3 && !tip; k++) { await pause(700); try { tip = await (await fetch('https://nether.wowhead.com/tooltip/item/' + itemId + '?dataEnv=16&locale=0')).json(); } catch (e) { await pause(30000); } }
    if (!tip) return null;
    const m = (tip.tooltip || '').match(/spell=(\\d+)/);
    cache['i' + itemId] = { spell: m ? +m[1] : 0, icon: tip.icon || '' }; keep(); return cache['i' + itemId];
  }
  const et = await page('/forever/spells/professions/enchanting'), eb = et.indexOf('var listviewspells = ');
  const recipes = (eb >= 0 ? arr(et, eb) : []).filter(x => /^Enchant /.test(x.name));
  counts.recipes = recipes.length;
  const enchants = [];
  for (const r of recipes) { const e = await enchOf(r.id); e.ef.forEach(x => enchants.push({ id: x.id, n: x.n, spell: r.id, sn: r.name, desc: e.desc, ic: e.ic, from: 'Enchanting', skill: r.learnedat || 0 })); }
  const pt = await page('/forever/items=0.6'), pb = pt.indexOf('var listviewitems = '), perm = pb >= 0 ? arr(pt, pb) : [];
  counts.enhancements = perm.length;
  for (const it of perm) {
    const tip = await tipOf(it.id); if (!tip || !tip.spell) continue;
    const e = await enchOf(tip.spell);
    e.ef.forEach(x => enchants.push({ id: x.id, n: x.n, spell: tip.spell, sn: it.name, desc: e.desc, ic: tip.icon || e.ic, from: it.name, item: it.id, req: it.reqlevel || 0 }));
  }
  counts.enchants = enchants.length;
  const txt = JSON.stringify({ collected: new Date().toISOString(), counts, items: Object.values(items), sets, enchants });
  // Round 166: packed (gzip, base64url) — about a fifth of the size, so it fits into one jump to the receiver.
  const gz = new Uint8Array(await new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let bin = ''; for (let i = 0; i < gz.length; i += 0x8000) bin += String.fromCharCode.apply(null, gz.subarray(i, i + 0x8000));
  const z = btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  localStorage.setItem('__wlx', z);
  const parts = Math.ceil(z.length / 1500000);
  if (parts === 1) setTimeout(() => { location.href = 'http://127.0.0.1:8799/save?part=0&of=1&z=' + z; }, 300);
  return { items: Object.keys(items).length, counts, packed: z.length, parts, next: parts === 1 ? 'jumping to the receiver' : 'too big for one jump: paste SEND(0) … SEND(' + (parts - 1) + ')' };
})()`;

// SEND(i): part i of the collected data to the local receiver; SEND(-1): forget the collected data in this tab.
const SEND = i => i < 0 ? "localStorage.removeItem('__wlx'); localStorage.removeItem('__wlx_cache'); 'removed'" :
  `(() => { const e = localStorage.getItem('__wlx'), N = 1500000, i = ${i}, n = Math.ceil(e.length / N);   // round 166: packed text, plain cuts
    setTimeout(() => { location.href = 'http://127.0.0.1:8799/save?part=' + i + '&of=' + n + '&z=' + e.slice(i * N, (i + 1) * N); }, 50);
    return 'part ' + i + ' of ' + n; })()`;

module.exports = { COLLECT, SEND };
if (require.main === module) console.log(process.argv[2] === 'send' ? SEND(+process.argv[3]) : COLLECT);
