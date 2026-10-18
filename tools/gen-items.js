// Builds data/item-db.js — the gear builder's item list — from the Wowhead Forever item data collected by
// tools/items-collect.js (saved as research/raw/forever-items.json by tools/items-receive.js).
//
// Kept: what a Warlock can wear (cloth, cloaks, necks, rings, trinkets, held-in-off-hand items, daggers, one-handed swords,
// staves, wands; not items for other classes only, not off-hand weapons) with at least one stat the sim uses for damage or
// mana: spell power (all, Shadow, Fire), hit, crit, haste, Spell Pierce, Intellect, Spirit, MP5. Stamina alone is not
// enough. Ratings become % with the sim's own rates (data/config.js: 10 hit rating = 1%, 14 crit rating = 1%, 10 haste
// rating = 1%). "Use:" and "Chance on hit:" effects are not in the stats (the sim does not simulate them yet).
// Icons: every item names its icon; tools/gen-item-icons.ps1 puts them into one image (art/items/icons.jpg), in the
// order of WL.ITEM_ICONS.names below.
//
// Usage: node tools/gen-items.js [raw json]   — prints what is new, changed or gone since the last data/item-db.js.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { load } = require('./load-wl.js');
const WL = load(ROOT, ['data/items.js']);
const RAW = process.argv[2] || path.join(ROOT, 'research/raw/forever-items.json');
const OUT = path.join(ROOT, 'data/item-db.js');
const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const cb = WL.DEFAULT_CONFIG.combat;

const WARLOCK_BIT = 256;                                   // class mask bit of the Warlock (class 9)
const ALLIANCE = 1 | 4 | 8 | 64 | 1024, HORDE = 2 | 16 | 32 | 128 | 512;   // race mask bits
const SLOT = { 1: 'head', 2: 'neck', 3: 'shoulder', 4: 'shirt', 5: 'chest', 20: 'chest', 6: 'waist', 7: 'legs', 8: 'feet', 9: 'wrist', 10: 'hands',
  11: 'finger', 12: 'trinket', 16: 'back', 13: 'oneHand', 21: 'mainHand', 17: 'twoHand', 23: 'offHand', 15: 'ranged', 26: 'ranged', 19: 'tabard' };
const QUALITY = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'heirloom'];
const WEAPON = { 'weapons/daggers': 'dagger', 'weapons/staves': 'staff', 'weapons/one-handed-swords': 'sword', 'weapons/wands': 'wand' };
const TEST_NAME = /\(TEST\)|^Test\b|\bTEST\b|Deprecated|\bDEP\b|\(old\)|\bOLD\b|zzOLD|^QA /i;
const r2 = x => Math.round(x * 100) / 100;

function stats(s) {
  const o = {
    sp: (s.splpwr || 0) + (s.spldmg || 0),                 // "damage and healing" and "damage" spell power
    shadowSp: s.shasplpwr || 0, fireSp: s.firsplpwr || 0,
    hitPct: r2((s.hitrtng || 0) / cb.ratingPerHitPct),
    critPct: r2((s.critstrkrtng || 0) / cb.ratingPerCritPct + (s.splcritstrkpct || 0)),
    hastePct: r2((s.hastertng || 0) / cb.ratingPerHastePct),
    pierce: s.splpen || 0,                                 // shown as "Spell Penetration" on Forever tooltips
    int: s.int || 0, spi: s.spi || 0, sta: s.sta || 0, mp5: s.manargn || 0,
  };
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  return o;
}
const USEFUL = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'int', 'spi', 'mp5'];
function from(x) {                                         // a short "where it comes from", when Wowhead knows it
  const m = (x.sm || [])[0], src = x.src || [];
  if (src.indexOf(1) >= 0) return 'Crafted';
  if (m && m.n && m.t === 1) return 'Drop: ' + m.n;
  if (m && m.n && m.t === 5) return 'Quest: ' + m.n;
  if (src.indexOf(5) >= 0) return 'Vendor';
  if (src.indexOf(4) >= 0) return 'Quest';
  if (src.indexOf(2) >= 0) return 'Drop';
  return '';
}

const dropped = { otherClass: 0, test: 0, slot: 0, noStat: 0 }, items = {}, icons = [], iconAt = {};
raw.items.slice().sort((a, b) => a.id - b.id).forEach(x => {
  if (x.rc && !(x.rc & WARLOCK_BIT)) { dropped.otherClass++; return; }
  if (TEST_NAME.test(x.n)) { dropped.test++; return; }
  const slot = SLOT[x.sl];
  if (!slot || !WL.GEAR_SLOTS.some(s => s.fits.indexOf(slot) >= 0)) { dropped.slot++; return; }
  const st = stats(x.s || {});
  if (!USEFUL.some(k => st[k])) { dropped.noStat++; return; }
  const ic = x.ic || 'inv_misc_questionmark';
  if (iconAt[ic] == null) { iconAt[ic] = icons.length; icons.push(ic); }
  const it = { name: x.n, slot, quality: QUALITY[x.q] || 'common', ilvl: x.l || 0, req: x.r || 0, stats: st, icon: iconAt[ic] };
  if (WEAPON[x.cat]) it.weapon = WEAPON[x.cat];
  if (x.set) it.set = x.set;
  if (x.mx === 1) it.unique = true;
  const side = x.rr && !(x.rr & HORDE) ? 'Alliance' : x.rr && !(x.rr & ALLIANCE) ? 'Horde' : '';
  if (side) it.side = side;
  const f = from(x); if (f) it.from = f;
  items[x.id] = it;
});

// What changed since the last file
let old = {};
try { const box = { window: {} }; box.WL = box.window.WL = {}; require('vm').runInNewContext(fs.readFileSync(OUT, 'utf8'), box); old = box.WL.ITEMS || {}; } catch (e) { old = {}; }
const ids = Object.keys(items), oldIds = Object.keys(old);
const added = ids.filter(id => !old[id]), gone = oldIds.filter(id => !items[id]);
const changed = ids.filter(id => old[id] && JSON.stringify(Object.assign({}, old[id], { icon: 0 })) !== JSON.stringify(Object.assign({}, items[id], { icon: 0 })));

const head = '// GENERATED by tools/gen-items.js from the Wowhead Forever item data (collected ' + String(raw.collected || '').slice(0, 10) + ') — do not edit by hand.\n' +
  '// The gear builder\'s item list: what a Warlock can wear with at least one stat the sim uses. Format: see data/items.js.\n' +
  '// icon = position in WL.ITEM_ICONS.names (art/items/icons.jpg, ' + 36 + ' px squares, ' + 24 + ' per row).\n' +
  'window.WL = window.WL || {};\n';
const body = 'WL.ITEM_DB = ' + JSON.stringify({ collected: String(raw.collected || '').slice(0, 10), count: ids.length }) + ';\n' +
  'WL.ITEM_ICONS = ' + JSON.stringify({ file: 'art/items/icons.jpg', size: 36, cols: 24, names: icons }) + ';\n' +
  'WL.ITEMS = {\n' + ids.map(id => '  ' + id + ': ' + JSON.stringify(items[id])).join(',\n') + '\n};\n';
fs.writeFileSync(OUT, head + body);
console.log('data/item-db.js: ' + ids.length + ' items, ' + icons.length + ' icons, ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
console.log('left out: ' + JSON.stringify(dropped));
const bySlot = {}; ids.forEach(id => { bySlot[items[id].slot] = (bySlot[items[id].slot] || 0) + 1; }); console.log('per slot: ' + JSON.stringify(bySlot));
console.log('since the last list: ' + added.length + ' new, ' + changed.length + ' changed, ' + gone.length + ' gone');
if (added.length && added.length <= 40) console.log('  new: ' + added.map(id => items[id].name).join(', '));
if (changed.length && changed.length <= 40) console.log('  changed: ' + changed.map(id => items[id].name).join(', '));
if (gone.length && gone.length <= 40) console.log('  gone: ' + gone.map(id => old[id].name).join(', '));
fs.writeFileSync(path.join(ROOT, 'research/raw/item-icons.txt'), icons.join('\n') + '\n');   // for tools/gen-item-icons.ps1
