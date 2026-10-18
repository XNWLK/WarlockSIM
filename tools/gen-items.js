// Builds data/item-db.js — the gear builder's item and enchant lists — from the Wowhead Forever data collected by
// tools/items-collect.js (saved as research/raw/forever-items.json by tools/items-receive.js).
//
// Items kept: what a Warlock can wear (cloth, cloaks, necks, rings, trinkets, held-in-off-hand items, daggers, one-handed
// swords, staves, wands; not off-hand weapons) and may wear: not items that name other classes only, not pieces of an item
// set for other classes (e.g. a Mage set), not the items in EXCLUDE. And at least one stat the sim uses for damage or
// mana: spell power (all, Shadow, Fire), hit, crit, haste, Spell Pierce, Spell Penetration, Intellect, Spirit, MP5.
// Stamina alone is not enough. Ratings become % with the sim's own rates (data/config.js: 10 hit rating = 1%, 14 crit
// rating = 1%, 10 haste rating = 1%). "Use:" and "Chance on hit:" effects are not in the stats (not simulated yet).
// Enchants kept: all of them (Enchanting recipes and permanent item enhancements), each game enchant once with every slot
// it can go on; only enchants for slots a Warlock does not have (shields, scopes) are left out. Their stats come from
// the enchant's name as the game shows it (e.g. "Intellect +5"), or its text when the name has none; an enchant
// without a stat the sim uses is listed all the same.
// Icons: items and enchants name their icons; tools/gen-item-icons.ps1 puts them into one image (art/items/icons.jpg),
// in the order of WL.ITEM_ICONS.names below.
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

const EXCLUDE = { 276765: 'Leafre\'s Ring of Precise Spell Power: 100 spell power at level 1, no source (user: remove it)' };
const WARLOCK_BIT = 256;                                   // class mask bit of the Warlock (class 9)
const ALLIANCE = 1 | 4 | 8 | 64 | 1024, HORDE = 2 | 16 | 32 | 128 | 512;   // race mask bits
const SLOT = { 1: 'head', 2: 'neck', 3: 'shoulder', 4: 'shirt', 5: 'chest', 20: 'chest', 6: 'waist', 7: 'legs', 8: 'feet', 9: 'wrist', 10: 'hands',
  11: 'finger', 12: 'trinket', 16: 'back', 13: 'oneHand', 21: 'mainHand', 17: 'twoHand', 23: 'offHand', 15: 'ranged', 26: 'ranged', 19: 'tabard' };
const QUALITY = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'heirloom'];
const WEAPON = { 'weapons/daggers': 'dagger', 'weapons/staves': 'staff', 'weapons/one-handed-swords': 'sword', 'weapons/wands': 'wand' };
const TEST_NAME = /\(TEST\)|^Test\b|\bTEST\b|Deprecated|\bDEP\b|\(old\)|\bOLD\b|zzOLD|^QA /i;
const r2 = x => Math.round(x * 100) / 100;
const decode = t => String(t || '').replace(/ (?:Always up to date|A spell)\.$/, '').replace(/&apos;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function stats(s) {
  const o = {
    sp: (s.splpwr || 0) + (s.spldmg || 0),                 // "damage and healing" and "damage" spell power
    shadowSp: s.shasplpwr || 0, fireSp: s.firsplpwr || 0,
    hitPct: r2((s.hitrtng || 0) / cb.ratingPerHitPct),
    critPct: r2((s.critstrkrtng || 0) / cb.ratingPerCritPct + (s.splcritstrkpct || 0)),
    hastePct: r2((s.hastertng || 0) / cb.ratingPerHastePct),
    spellPen: s.splpen || 0,                               // "Spell Penetration" (not Spell Pierce, user)
    int: s.int || 0, spi: s.spi || 0, sta: s.sta || 0, mp5: s.manargn || 0,
  };
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  return o;
}
const USEFUL = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'spellPen', 'int', 'spi', 'mp5'];
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

// Round 157 (item filters): what kind of source, and which raid (from the drop's zone, or a quest's zone).
const RAIDS = { 2717: 'Molten Core', 2159: "Onyxia's Lair", 2677: 'Blackwing Lair', 1977: "Zul'Gurub", 3429: "Ruins of Ahn'Qiraj", 3428: "Temple of Ahn'Qiraj", 3456: 'Naxxramas' };
const PVP_NAME = /\b(Marshal|Warlord|General|Legionnaire|Knight-Lieutenant|Knight-Captain|Blood Guard|Champion|Lieutenant Commander|Sergeant|Stone Guard|Premier)\b/;   // PvP gear by its rank names
function srcKind(x) {
  const src = x.src || [];
  if (PVP_NAME.test(x.n)) return 'pvp';
  if (src.indexOf(1) >= 0) return 'crafted';
  if (src.indexOf(4) >= 0) return 'quest';
  if (src.indexOf(5) >= 0) return 'vendor';
  if (src.indexOf(2) >= 0) return 'drop';
  return src.length ? 'other' : '';
}
function raidOf(x) { const m = (x.sm || []).map(y => RAIDS[y.z] || RAIDS[y.c]).filter(Boolean)[0]; return m || ''; }

// Item sets for other classes: their pieces are out
const otherClassSet = {}, otherClassPiece = {};
(raw.sets || []).forEach(s => { if (s.rc && !(s.rc & WARLOCK_BIT)) { otherClassSet[s.id] = s.n; (s.p || []).forEach(id => { otherClassPiece[id] = s.n; }); } });

const icons = [], iconAt = {};
const iconOf = ic => { ic = ic || 'inv_misc_questionmark'; if (iconAt[ic] == null) { iconAt[ic] = icons.length; icons.push(ic); } return iconAt[ic]; };
const dropped = { otherClass: 0, otherClassSet: 0, excluded: 0, test: 0, slot: 0, noStat: 0 }, items = {};
raw.items.slice().sort((a, b) => a.id - b.id).forEach(x => {
  if (EXCLUDE[x.id]) { dropped.excluded++; return; }
  if (x.rc && !(x.rc & WARLOCK_BIT)) { dropped.otherClass++; return; }
  if (otherClassPiece[x.id] || otherClassSet[x.set]) { dropped.otherClassSet++; return; }
  if (TEST_NAME.test(x.n)) { dropped.test++; return; }
  const slot = SLOT[x.sl];
  if (!slot || !WL.GEAR_SLOTS.some(s => s.fits.indexOf(slot) >= 0)) { dropped.slot++; return; }
  const st = stats(x.s || {});
  if (!USEFUL.some(k => st[k])) { dropped.noStat++; return; }
  const it = { name: x.n, slot, quality: QUALITY[x.q] || 'common', ilvl: x.l || 0, req: x.r || 0, stats: st, icon: iconOf(x.ic) };
  if (WEAPON[x.cat]) it.weapon = WEAPON[x.cat];
  if (x.set) it.set = x.set;
  if (x.mx === 1) it.unique = true;
  const side = x.rr && !(x.rr & HORDE) ? 'Alliance' : x.rr && !(x.rr & ALLIANCE) ? 'Horde' : '';
  if (side) it.side = side;
  const f = from(x); if (f) it.from = f;
  const sc = srcKind(x); if (sc) it.src = sc;
  const rd = raidOf(x); if (rd) it.raid = rd;
  items[x.id] = it;
});

// ---------- enchants ----------
// Which slots: from the recipe / item text ("Permanently enchant bracers …", "… to a leg or head slot item").
function enchSlots(text) {
  const t = text.toLowerCase().replace(/off-hand|off hand/g, 'offhand'), out = [];
  const add = k => { if (out.indexOf(k) < 0) out.push(k); };
  if (/bracer|wrist/.test(t)) add('wrist');
  if (/\bchest\b/.test(t)) add('chest');
  if (/\bboots\b|\bfeet\b|\bfoot\b/.test(t)) add('feet');
  if (/\bgloves\b|\bhands\b/.test(t)) add('hands');
  if (/\bcloak\b/.test(t)) add('back');
  if (/\bhead\b|\bhelm\b/.test(t)) add('head');
  if (/\blegs?\b|\bleggings\b|\bpants\b/.test(t)) add('legs');
  if (/\bshoulders?\b/.test(t)) add('shoulder');
  if (/\brings?\b|\bfinger\b/.test(t)) add('finger1'), add('finger2');
  if (/\boffhand\b/.test(t)) add('offHand');
  if (/\bnecklace\b|\bneck\b/.test(t)) add('neck');                 // Forever: necklace enchants
  if (/\bbelt\b|\bwaist\b/.test(t)) add('waist');                   // Forever: belt augments
  if (/weapon|\bstaff\b/.test(t) && !/ranged weapon|\bscope\b|\bbow\b|\bgun\b|\bcrossbow\b/.test(t)) add('mainHand');
  return out;
}
function twoHandOnly(text) { return /two-?handed|\b2h\b/i.test(text); }
// Stats: from the enchant's name ("Intellect +5", "+65 Spell Power", "Healing Spells +35/Damage Spells +12"); the text
// (e.g. "… and up to 19 points of damage to spells", "increase all stats by 4") when the name gives none.
function enchStats(name, text) {
  const o = {}, n = name, t = text;
  const num = (re, s) => { const m = s.match(re); return m ? +(m[1] || m[2]) : 0; };
  const set = (k, v) => { if (v) o[k] = (o[k] || 0) + v; };
  const fromName = () => {
    if (!/^(Frost|Arcane|Holy|Nature|Fire|Shadow)\b/i.test(n)) set('sp', num(/Spell Power \+(\d+)|\+(\d+) Spell Power/i, n) || num(/Healing and Spell Damage \+(\d+)|Spell Damage(?: and Healing)? \+(\d+)/i, n) || num(/\+(\d+) Spell Damage/i, n) ||
      num(/Damage Spells \+(\d+)/i, n));
    if (!/Frost|Arcane|Holy|Nature|Fire|Shadow/i.test(n)) { /* plain spell power handled above */ }
    set('shadowSp', num(/^Shadow (?:Spell )?Damage \+(\d+)/i, n));
    set('fireSp', num(/^Fire (?:Spell )?Damage \+(\d+)/i, n));
    set('int', num(/Intellect \+(\d+)|\+(\d+) Intellect/i, n));
    set('spi', num(/Spirit \+(\d+)|\+(\d+) Spirit/i, n));
    set('sta', num(/Stamina \+(\d+)|\+(\d+) Stamina/i, n));
    const all = num(/All Stats \+(\d+)|\+(\d+) All Stats/i, n); if (all) { set('int', all); set('spi', all); set('sta', all); }
    set('mp5', num(/Mana Regen \+?(\d+)|(\d+) mana (?:every|per) 5/i, n));
    set('hastePct', num(/Haste \+(\d+)%|\+(\d+)% Haste/i, n));
    set('hitPct', num(/Spell Hit \+(\d+)%|\+(\d+)% Spell Hit/i, n));   // an enchant's plain "Hit +1%" is melee / ranged hit
    set('critPct', num(/Crit(?:ical Strike)?(?: Chance)? \+(\d+)%|\+(\d+)% (?:Spell )?Crit/i, n));
    set('hitPct', r2(num(/Hit Rating \+(\d+)|\+(\d+) Hit Rating/i, n) / cb.ratingPerHitPct));
    set('critPct', r2(num(/Critical Strike Rating \+(\d+)|\+(\d+) Critical Strike Rating/i, n) / cb.ratingPerCritPct));
    set('hastePct', r2(num(/Haste Rating \+(\d+)|\+(\d+) Haste Rating/i, n) / cb.ratingPerHastePct));
    set('spellPen', num(/Spell Penetration \+(\d+)|\+(\d+) Spell Penetration/i, n));
  };
  fromName();
  if (!Object.keys(o).length) {                            // the name says nothing usable: the text
    set('sp', num(/up to (\d+) points of damage to (?:damage )?spells/i, t) || num(/up to (\d+) (?:points of )?damage (?:to|of) spells|damage spells by up to (\d+)|damage done by spells by up to (\d+)/i, t) || num(/add up to (\d+) damage to spells/i, t));
    const all = num(/all stats by (\d+)/i, t); if (all) { set('int', all); set('spi', all); set('sta', all); }
  }
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  return o;
}
const enchants = {}, enchDropped = { noSlot: 0 };
(raw.enchants || []).forEach(e => {
  const text = decode(e.desc), slots = enchSlots(text);
  const name = /^\$/.test(e.n) ? decode(e.sn) : decode(e.n);       // an unfinished game text ("$@spelldesc…"): the item's name
  const src = /^Enchant /.test(e.from) ? 'Enchanting' : e.from;   // an enchanting scroll counts as Enchanting
  if (!slots.length) { enchDropped.noSlot++; return; }
  const cur = enchants[e.id];
  if (cur) {                                               // the same enchant from another recipe / item: more slots, more sources
    slots.forEach(s => { if (cur.slots.indexOf(s) < 0) cur.slots.push(s); });
    if (slots.indexOf('mainHand') >= 0) cur.mh.push(twoHandOnly(text));
    if (cur.from.indexOf(src) < 0) cur.from.push(src);
    return;
  }
  const en = { name, slots, stats: enchStats(name, text), text, from: [src], icon: iconOf(e.ic), mh: slots.indexOf('mainHand') >= 0 ? [twoHandOnly(text)] : [] };
  enchants[e.id] = en;
});
Object.keys(enchants).forEach(id => { const e = enchants[id]; e.slots.sort((a, b) => WL.GEAR_SLOTS.findIndex(s => s.key === a) - WL.GEAR_SLOTS.findIndex(s => s.key === b)); e.from = e.from.join(', '); if (e.mh.length && e.mh.every(Boolean)) e.twoHand = true; delete e.mh; });   // twoHand: only on a two-handed weapon

// What changed since the last file
let old = {}, oldE = {};
try { const box = { window: {} }; box.WL = box.window.WL = {}; require('vm').runInNewContext(fs.readFileSync(OUT, 'utf8'), box); old = box.WL.ITEMS || {}; oldE = box.WL.ENCHANTS || {}; } catch (e) { old = {}; }
const diff = (now, before) => {
  const ids = Object.keys(now), oldIds = Object.keys(before), norm = o => JSON.stringify(Object.assign({}, o, { icon: 0 }));
  return { added: ids.filter(id => !before[id]), gone: oldIds.filter(id => !now[id]), changed: ids.filter(id => before[id] && norm(before[id]) !== norm(now[id])) };
};
const di = diff(items, old), de = diff(enchants, oldE);

const ids = Object.keys(items), eids = Object.keys(enchants);
const head = '// GENERATED by tools/gen-items.js from the Wowhead Forever data (collected ' + String(raw.collected || '').slice(0, 10) + ') — do not edit by hand.\n' +
  '// The gear builder\'s lists: the items a Warlock can wear with at least one stat the sim uses, and every enchant.\n' +
  '// Formats: see data/items.js. icon = position in WL.ITEM_ICONS.names (art/items/icons.jpg, 36 px squares, 24 per row).\n' +
  'window.WL = window.WL || {};\n';
const body = 'WL.ITEM_DB = ' + JSON.stringify({ collected: String(raw.collected || '').slice(0, 10), count: ids.length, enchants: eids.length }) + ';\n' +
  'WL.ITEM_ICONS = ' + JSON.stringify({ file: 'art/items/icons.jpg', size: 36, cols: 24, names: icons }) + ';\n' +
  'WL.ITEMS = {\n' + ids.map(id => '  ' + id + ': ' + JSON.stringify(items[id])).join(',\n') + '\n};\n' +
  'WL.ENCHANTS = {\n' + eids.map(id => '  ' + id + ': ' + JSON.stringify(enchants[id])).join(',\n') + '\n};\n';
fs.writeFileSync(OUT, head + body);
console.log('data/item-db.js: ' + ids.length + ' items, ' + eids.length + ' enchants, ' + icons.length + ' icons, ' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
console.log('items left out: ' + JSON.stringify(dropped) + '; enchants left out: ' + JSON.stringify(enchDropped));
const bySlot = {}; ids.forEach(id => { bySlot[items[id].slot] = (bySlot[items[id].slot] || 0) + 1; }); console.log('items per slot: ' + JSON.stringify(bySlot));
const eSlot = {}; eids.forEach(id => enchants[id].slots.forEach(s => { eSlot[s] = (eSlot[s] || 0) + 1; })); console.log('enchants per slot: ' + JSON.stringify(eSlot));
const show = (label, d, now, before) => {
  console.log(label + ' since the last list: ' + d.added.length + ' new, ' + d.changed.length + ' changed, ' + d.gone.length + ' gone');
  if (d.added.length && d.added.length <= 40) console.log('  new: ' + d.added.map(id => now[id].name).join(', '));
  if (d.changed.length && d.changed.length <= 40) console.log('  changed: ' + d.changed.map(id => now[id].name).join(', '));
  if (d.gone.length && d.gone.length <= 40) console.log('  gone: ' + d.gone.map(id => before[id].name).join(', '));
};
show('items', di, items, old); show('enchants', de, enchants, oldE);
fs.writeFileSync(path.join(ROOT, 'research/raw/item-icons.txt'), icons.join('\n') + '\n');   // for tools/gen-item-icons.ps1
