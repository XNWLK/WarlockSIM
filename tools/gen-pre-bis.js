// Builds data/pre-bis-gear.js — the Pre-BiS gear of every build as the fight engine needs it (round 211, user: "change the
// quick gear setups from default & hit capped to Pre-BiS and Custom … have Pre-BiS be the items and stats straight from
// that artifact. make the items show up in the gear builder"; each build its own list, the user's choice).
// From data/pre-raid-bis.js (the user's lists) and data/item-db.js: per build the item ids per slot and the stat totals of
// its items and set bonuses (as the gear builder counts them, app/gear-builder.js WL.gearSheet). The engine (engine/stats.js
// WL.cfgFor) turns them into the Sheet (gear) values — naked crit and crit from Intellect from the fight's own settings —
// so the Web Workers need no item list. `_common`: per slot the item most builds wear, for builds without a list of
// their own (your own builds).
//   node tools/gen-pre-bis.js            (after a change to data/pre-raid-bis.js or the item list)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { load } = require('./load-wl.js');
const WL = load(ROOT, ['data/items.js', 'data/item-db.js', 'data/pre-raid-bis.js', 'app/gear-builder.js']);

// Round 248 (user: "add a gear preset … called Max Pre-BiS … the maximum power available right now, regardless of reputation
// or money constraints"): the same for the Max Pre-BiS lists (WL.MAX_PRE_RAID_BIS, each with its own enchants,
// WL.MAX_PRE_RAID_BIS_ENCHANTS) → WL.MAX_BIS_GEAR, written after WL.PRE_BIS_GEAR (whose part of the file stays as it was).

// the item most builds wear in each slot (rings and trinkets as pairs: the two worn most often)
function commonOf(L, keys) {
  const common = {};
  WL.GEAR_SLOTS.forEach(s => {
    if (/^(finger|trinket)2$/.test(s.key)) return;
    const pair = /^(finger|trinket)1$/.test(s.key) ? [s.key, s.key.replace('1', '2')] : [s.key], n = {};
    keys.forEach(k => pair.forEach(p => { const id = L[k][p]; if (id) n[id] = (n[id] || 0) + 1; }));
    const top = Object.keys(n).sort((a, b) => n[b] - n[a] || a - b).slice(0, pair.length);
    pair.forEach((p, i) => { if (top[i]) common[p] = +top[i]; });
  });
  return common;
}
// per build (and `_common`): slots, enchants on the slots that hold an item, and the stat sums
function gen(L, enchOf, commonEnch, common) {
  const out = {};
  Object.keys(L).concat(['_common']).forEach(k => {
    const slots = k === '_common' ? common : L[k], gb = { on: true, slots: {}, enchants: {}, manual: {} }, EN = k === '_common' ? commonEnch : enchOf(k), ench = {};   // round 214: per-build gloves
    // round 213: the Phase 1 enchants (data/pre-raid-bis.js WL.PRE_RAID_BIS_ENCHANTS), on the slots that hold an item
    Object.keys(EN).forEach(s => { if (!slots[s]) return; const e = EN[s]; if (typeof e === 'number' && !WL.ENCHANTS[e]) throw new Error(s + ': enchant ' + e + ' is not in data/item-db.js'); gb.enchants[s] = typeof e === 'number' ? { id: e } : e; ench[s] = gb.enchants[s]; });
    Object.keys(slots).forEach(s => { if (!WL.ITEMS[slots[s]]) throw new Error(k + ' ' + s + ': item ' + slots[s] + ' is not in data/item-db.js'); gb.slots[s] = { id: slots[s] }; });
    const r = WL.gearSheet(gb, WL.DEFAULT_CONFIG), sums = {};
    WL.GEAR_STAT_KEYS.forEach(st => { const v = Math.round((r.items[st] + r.sets[st] + r.enchants[st]) * 100) / 100; if (v) sums[st] = v; });
    out[k] = { slots: Object.assign({}, slots), enchants: ench, sums };
  });
  return out;
}
const L = WL.PRE_RAID_BIS, keys = Object.keys(L);
const out = gen(L, k => WL.preRaidBisEnchants(k), WL.PRE_RAID_BIS_ENCHANTS, commonOf(L, keys));

// Max Pre-BiS: `_common` wears the items most builds wear, each with the enchant most of the builds wearing it there have
// (a two-hander leaves the off hand empty)
const M = WL.MAX_PRE_RAID_BIS || {}, mkeys = Object.keys(M), ME = WL.MAX_PRE_RAID_BIS_ENCHANTS || {};
let mout = null;
if (mkeys.length) {
  mkeys.forEach(k => {
    if (!ME[k]) throw new Error('Max Pre-BiS ' + k + ': no enchants in WL.MAX_PRE_RAID_BIS_ENCHANTS');
    const it = WL.ITEMS[M[k].mainHand];
    if (it && it.slot === 'twoHand' && M[k].offHand) throw new Error('Max Pre-BiS ' + k + ': a two-hander and an off hand');
    if (WL.gearUniqueOver({ slots: Object.keys(M[k]).reduce((o, s) => { o[s] = { id: M[k][s] }; return o; }, {}) }).length) throw new Error('Max Pre-BiS ' + k + ': unique-equipped broken');
    Object.keys(ME[k]).forEach(s => { const e = ME[k][s], en = typeof e === 'number' ? WL.ENCHANTS[e] : null;
      if (en && en.twoHand && !(it && it.slot === 'twoHand' && s === 'mainHand')) throw new Error('Max Pre-BiS ' + k + ': two-hand enchant ' + e + ' without a two-hander'); });
  });
  const mc = commonOf(M, mkeys), mce = {};
  if (mc.mainHand && WL.ITEMS[mc.mainHand].slot === 'twoHand') delete mc.offHand;
  Object.keys(mc).forEach(s => {
    const n = {}, wear = mkeys.filter(k => M[k][s] === mc[s]);
    (wear.length ? wear : mkeys).forEach(k => { const e = ME[k][s]; if (e != null) { const j = JSON.stringify(e); n[j] = (n[j] || 0) + 1; } });
    const top = Object.keys(n).sort((a, b) => n[b] - n[a] || (a < b ? -1 : 1))[0];
    if (top) mce[s] = JSON.parse(top);
  });
  mout = gen(M, k => ME[k], mce, mc);
}

const js = '// GENERATED by tools/gen-pre-bis.js from data/pre-raid-bis.js and data/item-db.js — do not edit by hand (round 211).\n' +
  '// Pre-BiS gear per build for the fight engine: slots (item ids), enchants (round 213) and sums (stat totals of the items,\n' +
  '// set bonuses and enchants, no naked values, crit without Intellect\'s share). engine/stats.js WL.cfgFor uses it when\n' +
  '// cfg.gearMode is \'preBis\'.\n' +
  'window.WL = window.WL || {};\n' +
  'WL.PRE_BIS_GEAR = {\n' + Object.keys(out).map(k => '  ' + k + ': ' + JSON.stringify(out[k])).join(',\n') + '\n};\n' +
  (mout ? '// Round 248: Max Pre-BiS gear per build (data/pre-raid-bis.js WL.MAX_PRE_RAID_BIS), the same format; WL.cfgFor uses it when\n' +
    '// cfg.gearMode is \'maxBis\'.\n' +
    'WL.MAX_BIS_GEAR = {\n' + Object.keys(mout).map(k => '  ' + k + ': ' + JSON.stringify(mout[k])).join(',\n') + '\n};\n' : '');
fs.writeFileSync(path.join(ROOT, 'data/pre-bis-gear.js'), js);
console.log('data/pre-bis-gear.js: ' + keys.length + ' builds + _common' + (mout ? '; Max Pre-BiS: ' + mkeys.length + ' builds + _common' : ''));
Object.keys(out).forEach(k => console.log('  ' + k + ' ' + JSON.stringify(out[k].sums)));
if (mout) Object.keys(mout).forEach(k => console.log('  max ' + k + ' ' + JSON.stringify(mout[k].sums)));
