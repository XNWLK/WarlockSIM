// Builds data/item-tips.js — the in-game style tooltips of the gear builder's items (round 210, user: "build a tooltip popup
// when you hover over an item that is as close to an ingame one as you can make it") — from the Wowhead Forever tooltips
// in research/raw/forever-tooltips.json (one per item of data/item-db.js, fetched from Wowhead's tooltip service).
//
// Each tooltip is kept as a small piece of HTML made only of the tags and classes the page styles (WL.tipClean below):
// b, span, br, div, table / tr / td / th; classes q (yellow), q0–q7 (quality colours), indent; table width → class "w".
// Everything else (links, ids, styles, scripts, attributes) is dropped, so the page can show it as it is. Left out, as the
// game does not show them in an item's tooltip: Wowhead's item level line, the sell price, "Dropped by" / drop chance.
//
// Usage: node tools/gen-tooltips.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const RAW = path.join(ROOT, 'research/raw/forever-tooltips.json');
const OUT = path.join(ROOT, 'data/item-tips.js');

const TAGS = { b: 1, span: 1, br: 1, div: 1, table: 1, tr: 1, td: 1, th: 1 };
const CLASS = /^(q[0-7]?|indent)$/;
const ENT = /^&(amp|lt|gt|quot|apos|nbsp|#\d{1,6}|#x[0-9a-f]{1,6});/i;

// Wowhead tooltip HTML → the allowed subset (pure function; also used by tests through module.exports).
function clean(h) {
  h = String(h || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<span class="q[^"]*"><br>Item Level \d+<\/span>/g, '')             // Wowhead's item level line
    .replace(/<div class="whtt-sellprice">[\s\S]*?<\/div>/g, '')               // sell price (with its money spans)
    .replace(/<div class="whtt-extra[^"]*">[\s\S]*?<\/div>/g, '')              // dropped by / drop chance
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  let out = '', i = 0;
  const open = [];
  while (i < h.length) {
    const c = h[i];
    if (c === '<') {
      const e = h.indexOf('>', i); if (e < 0) break;
      const raw = h.slice(i + 1, e).trim(); i = e + 1;
      const m = /^(\/?)([a-z0-9]+)([\s\S]*)$/i.exec(raw); if (!m) continue;
      const close = !!m[1], tag = m[2].toLowerCase(), attrs = m[3] || '';
      if (!TAGS[tag]) continue;                                               // a link, image … : its text stays
      if (tag === 'br') { out += '<br>'; continue; }
      if (close) { const k = open.lastIndexOf(tag); if (k >= 0) { while (open.length > k) out += '</' + open.pop() + '>'; } continue; }
      const cls = ((/\bclass="([^"]*)"/.exec(attrs) || [])[1] || '').split(/\s+/).filter(x => CLASS.test(x));
      if (tag === 'table' && /\bwidth="100%"/.test(attrs)) cls.push('w');
      out += '<' + tag + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>'; open.push(tag);
    } else if (c === '>') { out += '&gt;'; i++; }
    else if (c === '&') { const m = ENT.exec(h.slice(i, i + 12)); if (m) { out += m[0]; i += m[0].length; } else { out += '&amp;'; i++; } }
    else { out += c; i++; }
  }
  while (open.length) out += '</' + open.pop() + '>';
  return out.replace(/\s*\n\s*/g, ' ').replace(/(<br>\s*){3,}/g, '<br><br>').replace(/(<br>\s*)+(<\/td>)/g, '$2').replace(/<span>\s*<\/span>|<span class="q1"><\/span>/g, '')
    .replace(/(<\/span>)<br><br>(<span class="q2">)/g, '$1<br>$2').trim();   // no empty line between Equip / Use lines (as in the game)
}
// Round 211: a set whose bonuses come from the game (WL.ITEM_SETS[id].game): its piece list = the set's items by name, its
// bonus lines = the set's bonuses ("(2) Set: …", grey; the page colours the ones you have).
function gameSet(h, set, items) {
  const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return h.replace(/<div class="q0 indent">[\s\S]*?<\/div>/, '<div class="q0 indent">' + set.items.map(i => '<span>' + e(items[i].name) + '</span>').join('<br>') + '</div>')
    .replace(/<span class="q0">(?:(?!<span class="q0">)[\s\S])*<\/span>(<\/td><\/tr><\/table>)$/, (m, end) =>
      '<span class="q0">' + set.bonuses.map(b => '<span>(' + b.n + ') Set: ' + e(b.text) + '</span>').join('<br>') + '</span>' + end);
}
module.exports = { clean, gameSet };

if (require.main === module) {
  const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  const box = { window: {} }; box.WL = box.window.WL = {};
  require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'data/item-db.js'), 'utf8'), box);
  const items = box.WL.ITEMS, tips = {};
  let n = 0, miss = [], off = [];
  // A tooltip that leaves out a stat the item list has (Wowhead's two disagree for a few items): left out, so the page
  // builds that item's tooltip from the stats the sim counts.
  const lacks = (it, h) => (it.stats.int && !/Intellect/.test(h)) || (it.stats.spi && !/Spirit/.test(h)) || (it.stats.sta && !/Stamina/.test(h)) || (it.stats.sp && !/damage/i.test(h));
  Object.keys(items).forEach(id => {
    const t = raw.tips[id]; if (!t || !t.h) { miss.push(id); return; }
    let h = clean(t.h); if (lacks(items[id], h)) { off.push(items[id].name); return; }
    const set = items[id].set && (box.WL.ITEM_SETS || {})[items[id].set];
    if (set && set.game) h = gameSet(h, set, items);   // round 211: the set bonuses as the game shows them (tools/gen-items.js SET_GAME)
    tips[id] = h; n++;
  });
  if (off.length) console.log('tooltips left out (a stat of the item list is missing in them): ' + off.join(', '));
  // The consumables' tooltips (data/consumables.js; flasks, elixirs, potions, food …): a small file loaded with the page.
  const cbox = { window: {} }; cbox.WL = cbox.window.WL = {};
  require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'data/consumables.js'), 'utf8'), cbox);
  const cons = cbox.WL.CONSUMABLES || {}, ctips = {}, cmiss = [];
  Object.keys(cons).forEach(k => { const id = cons[k].id, t = id && raw.tips[id]; if (t && t.h) ctips[id] = clean(t.h); else if (id) cmiss.push(cons[k].name); });
  const COUT = path.join(ROOT, 'data/con-tips.js');
  fs.writeFileSync(COUT, '// GENERATED by tools/gen-tooltips.js from the Wowhead Forever tooltips — do not edit by hand.\n' +
    '// The consumables\' in-game style tooltips (round 210): item id → HTML (same tags and classes as data/item-tips.js).\n' +
    'window.WL = window.WL || {};\nWL.CON_TIPS = {\n' + Object.keys(ctips).map(id => '  ' + id + ': ' + JSON.stringify(ctips[id])).join(',\n') + '\n};\n');
  console.log('data/con-tips.js: ' + Object.keys(ctips).length + ' consumable tooltips' + (cmiss.length ? ', none for ' + cmiss.join(', ') : ''));
  const body = '// GENERATED by tools/gen-tooltips.js from the Wowhead Forever tooltips (collected ' + String(raw.collected || '').slice(0, 10) + ') — do not edit by hand.\n' +
    '// The gear builder\'s in-game style item tooltips (round 210): item id → HTML (b, span, br, div, table; classes q, q0–q7,\n' +
    '// indent, w). Loaded by the page the first time a tooltip is needed.\n' +
    'window.WL = window.WL || {};\n' +
    'WL.ITEM_TIPS = {\n' + Object.keys(tips).map(id => '  ' + id + ': ' + JSON.stringify(tips[id])).join(',\n') + '\n};\n';
  fs.writeFileSync(OUT, body);
  console.log('data/item-tips.js: ' + n + ' tooltips, ' + miss.length + ' items without one' + (miss.length && miss.length <= 30 ? ' (' + miss.join(', ') + ')' : '') + ', ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
}
