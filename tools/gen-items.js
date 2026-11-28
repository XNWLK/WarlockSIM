// Builds data/item-db.js — the gear builder's item and enchant lists — from the Wowhead Forever data collected by
// tools/items-collect.js (saved as research/raw/forever-items.json by tools/items-receive.js).
//
// Items kept: what a Warlock can wear (cloth, cloaks, necks, rings, trinkets, held-in-off-hand items, daggers, one-handed
// swords, staves, wands; not off-hand weapons) and may wear: not items that name other classes only, not pieces of an item
// set for other classes (e.g. a Mage set), not the items in EXCLUDE. And at least one stat the sim uses for damage or
// mana: spell power (all, Shadow, Fire), hit, crit, haste, Spell Pierce, Spell Penetration, Intellect, Spirit, MP5.
// Round 210: Wowhead's splpen is Spell Pierce on Forever items (their tooltips: "Your spells pierce N Magical Resistance").
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
const WL = load(ROOT, ['data/items.js', 'data/item-phases.js']);
const RAW = process.argv[2] || path.join(ROOT, 'research/raw/forever-items.json');
const OUT = path.join(ROOT, 'data/item-db.js');
const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const cb = WL.DEFAULT_CONFIG.combat;

const EXCLUDE = { 276765: 'Leafre\'s Ring of Precise Spell Power: 100 spell power at level 1, no source (user: remove it)' };
// Round 211 (user: "the vendor version of deathmist can be tossed. only keep the quest versions …") left out the set-1681
// pieces 226905–226912 and kept the Classic quest pieces (set 518). Round 245 turns that round (user, with the Wowhead Forever
// page of item set 1681 "Deathmist Raiment": "these are the ones that are available"): 226905–226912 are in, and the Classic
// Deathmist 22070–22077 (set 518) is out — not in the game.
[22070, 22071, 22072, 22073, 22074, 22075, 22076, 22077].forEach(id => { EXCLUDE[id] = 'Deathmist (Classic quest version, set 518): not in the game (round 245, user: set 1681 "these are the ones that are available")'; });
EXCLUDE[254013] = 'Earthen Silk Slippers: wrong stats on Wowhead (user, round 216: "scrap them completely")';
EXCLUDE[237820] = 'Outrider\'s Silk Leggings ilvl 78: no source or reputation on Wowhead; the in-game Warsong Exalted pants are 22747 (user, round 232: "change pants in the sim")';
// round 233 (item sync of 2026-11-18): new ids without any source on Wowhead
// Round 245: still out — set 1681's piece list names them, but they have no source and no tooltip on Wowhead, and their stats
// are the Classic quest pieces'; the user's set-1681 page lists 226905–226912 (in, above).
[226921, 226922, 226923, 226924, 226925, 226926, 226927, 226928].forEach(id => { EXCLUDE[id] = 'Deathmist (set 1681 piece list, new ids, no source): the Wowhead set page lists 226905–226912 (round 245)'; });
[288831, 288837, 288906, 288910, 288914, 288915, 288917, 288919, 288923, 288924].forEach(id => { EXCLUDE[id] = 'Molten Core names at item level 30, required level 1, no source: template data, not in the game'; });
EXCLUDE[237815] ='Sentinel\'s Silk Leggings ilvl 78: the Alliance twin of 237820, no reputation on Wowhead; the Silverwing Exalted pants are 22752 (round 232)';
// Stats where Wowhead's item list disagrees with the item's own tooltip: the tooltip's numbers are used.
const STATS_FIX = { 254013: { s: { splpwr: 18, spldmg: 6, spi: 7 }, why: 'Earthen Silk Slippers: tooltip +24 damage / +18 healing; the list said 6 / 11 on 2026-11-13' },
  // Round 211 (user: "looks like bad hat lost the shadow dmg on it"): in the game it no longer has its +23 Shadow damage.
  260212: { s: { splpwr: 12, splheal: 25, int: 17, spi: 17 }, why: 'Bad Hat: no Shadow damage in the game any more (user); Wowhead still lists +23' },
  // Round 216 (user: "when i hover over channeler's it shows a different tooltip than when i click on it"): Wowhead changed it after
  // our list of 2026-11-14 — now +14 Intellect, 1% hit, +9 spell damage and healing, no Spirit (its page, read 2026-11-15).
  272406: { s: { int: 14, hitrtng: 10, splpwr: 9 }, why: "Channeler's Ring: changed on Wowhead after 2026-11-14 (+9 spell power, no Spirit)" },
  // Round 217 (user: "use 21 shadow wrath bracers as main for wrack"): a random-suffix item, kept as its "of Shadow Wrath" roll —
  // +21 Shadow damage (Wowhead Classic's random enchantments; Wowhead Forever lists none).
  11766: { s: { shasplpwr: 21 }, name: 'Flameweave Cuffs of Shadow Wrath', why: 'random suffix: the user picked the +21 Shadow Wrath roll' },
  // Round 238 (user, in-game screenshot: "add this to the bis list as an upgrade, not as a default"): Emperor's Seal kept as its
  // "of Magic" roll, +20 spell damage and healing (and +6 Arcane / Frost Resistance, not used).
  11934: { s: { splpwr: 20 }, name: "Emperor's Seal of Magic", why: 'random suffix: the of Magic roll (+20; user, in-game tooltip)' },
  13409: { s: { shasplpwr: 22 }, name: 'Tearfall Bracers of Shadow Wrath', why: 'random suffix: the +22 Shadow Wrath roll (round 220, user: "looks like those bracers can roll up to 22"; in-game tooltip)' },
  // Round 218 (user: "use shadow wrath for wrack and have omnicast as the alternative"): boots kept as their top "of Shadow Wrath"
  // roll, +30 Shadow damage (Wowhead Classic: +29 – 30, 8.3%; the user: "i think they go up to 30").
  10247: { s: { shasplpwr: 30 }, name: "Master's Boots of Shadow Wrath", why: 'random suffix: the user picked the Shadow Wrath roll (+30)' },
  // Round 218 (user: "yes make the belt main for wrack, waistcord as alternative"; asked which belt: "Master's Belt"): +30 Shadow.
  // Wowhead Classic lists no Shadow Wrath roll for it (only Fiery Wrath, +29 – 30); the user says Forever has one.
  10255: { s: { shasplpwr: 30 }, name: "Master's Belt of Shadow Wrath", why: 'random suffix: the user picked the Shadow Wrath roll (+30; Forever only)' },
  // Round 261 (user: "check if shadow wrath pants are an upgrade for wrack ds … shadow wrath pants go up to 40"): Master's Leggings
  // (ilvl 64, Requires Level 59, Binds when equipped, world drop), the highest-level Phase 1 non-raid cloth legs with a random
  // suffix (High Councillor's Pants / Eternal Sarong ilvl 63; all three give only the suffix's stat). Kept as its +40 Shadow Wrath
  // roll; Wowhead Classic lists Fiery Wrath +40 – 41 for it, no Shadow Wrath (like Master's Belt) — Forever has the roll (user).
  10252: { s: { shasplpwr: 40 }, name: "Master's Leggings of Shadow Wrath", why: 'random suffix: the Shadow Wrath roll, +40 (round 261, user: "shadow wrath pants go up to 40")' } };
// Round 217 (user: "swap wrack main to leggings of torment"): items missing from our Wowhead list (stats hidden when it was
// collected), as raw records from their Wowhead Forever page (read 2026-11-15).
const EXTRA = [
  { id: 22342, n: 'Leggings of Torment', l: 63, r: 58, q: 3, sl: 7, sub: 1, cls: 4, ic: 'inv_pants_09', set: 0, mx: 0, rc: 0, rr: 0, rf: 0,
    s: { shasplpwr: 34, int: 16, sta: 16 }, src: [2], sm: [{ n: 'Lord Valthalak', t: 1, z: 1583 }], cat: 'armor/cloth/slot:7' },
  // Round 254 (user: "magician's cord is now usable by warlocks as well"): Wowhead Forever still marks it Mage only (classes 128),
  // so tools/items-collect.js left it out of the list. Its Wowhead Forever page and tooltip (read 2026-11-25): Epic, item level 60,
  // Requires Level 60, Binds when picked up, 52 Armor, +12 Stamina, +24 Intellect, +19 spell damage and healing; sold by Pix
  // Xizzix (Undermine Trader, Stranglethorn Vale) for 100 Tarnished Undermine Real.
  { id: 272393, n: "Magician's Cord", l: 60, r: 60, q: 4, sl: 6, sub: 1, cls: 4, ic: 'inv_belt_43a', set: 0, mx: 0, rc: 128, rr: 0, rf: 0,
    s: { splpwr: 19, int: 24, sta: 12 }, src: [5], sm: [{ n: 'Pix Xizzix', t: 1, ti: 227853, z: 33 }], cat: 'armor/cloth/slot:6' },
  // Round 276 (user: "also add green lens of shadow wrath (+36) and green lens of fiery wrath (+36) to the gear builder. i dont think
  // it's gonna beat anything on the bis list but it's a good option for people to test"): Green Lens (10504, Engineering, item
  // level 49, Binds when equipped, 57 Armor, +10 Stamina, a random enchantment; Requires Engineering (245)) as two of its rolls —
  // two rolls of one item need two ids, so each gets its own: 10504 × 10000 + the roll's random-enchantment id (Wowhead Forever
  // tooltip, read 2026-11-28: rand 1861 = "of Shadow Wrath" +36 Shadow Spell Damage, rand 1899 = "of Fiery Wrath" +36 Fire Spell
  // Damage). Not real game item ids: nothing in the sim links an item id to Wowhead.
  { id: 105041861, n: 'Green Lens of Shadow Wrath', l: 49, r: 10, q: 3, sl: 1, sub: 1, cls: 4, ic: 'inv_helmet_44', set: 0, mx: 0, rc: 0, rr: 0, rf: 0,
    s: { shasplpwr: 36, sta: 10 }, src: [1], sm: [{ n: 'Green Lens', t: 6, c: 11, ti: 12622 }], cat: 'armor/cloth/slot:1' },
  { id: 105041899, n: 'Green Lens of Fiery Wrath', l: 49, r: 10, q: 3, sl: 1, sub: 1, cls: 4, ic: 'inv_helmet_44', set: 0, mx: 0, rc: 0, rr: 0, rf: 0,
    s: { firsplpwr: 36, sta: 10 }, src: [1], sm: [{ n: 'Green Lens', t: 6, c: 11, ti: 12622 }], cat: 'armor/cloth/slot:1' },
];
// Round 254: items Wowhead names for other classes only that a Warlock can wear in the game (the user) — kept despite the class
// mask (also kept by tools/items-collect.js from now on, CLASS_OK there).
const CLASS_OK = { 272393: "Magician's Cord: Mage only on Wowhead; usable by Warlocks in the game (user, 2026-11-25)" };
EXTRA.forEach(x => { if (!raw.items.some(y => y.id === x.id)) raw.items.push(x); });
// Round 217: where an item comes from, where Wowhead's list names a vendor's NPC as a drop (Rugged Mantle of the Timbermaw: sold
// by Meilosh, the Timbermaw Hold quartermaster; Wowhead lists only a vendor source).
// Round 218: Master's Boots are a world drop (109 creatures on its Wowhead Forever page, 2026-11-15); the list names only
// Gahz'ranka (Zul'Gurub), which would mark it as a raid item.
const FROM_FIX = { 227808: 'Vendor: Meilosh', 10247: 'World drop', 10255: 'World drop', 10252: 'World drop' };   // Master's Belt: 112 creatures; Master's Leggings (round 261): no creature named on Wowhead, a random-suffix world drop like its set-mates
const WORLD_DROP = { 10247: 1, 10255: 1, 10252: 1 };
raw.items.forEach(x => { if (WORLD_DROP[x.id]) x.sm = []; });
const WARLOCK_BIT = 256;                                   // class mask bit of the Warlock (class 9)
const ALLIANCE = 1 | 4 | 8 | 64 | 1024, HORDE = 2 | 16 | 32 | 128 | 512;   // race mask bits
const SLOT = { 1: 'head', 2: 'neck', 3: 'shoulder', 4: 'shirt', 5: 'chest', 20: 'chest', 6: 'waist', 7: 'legs', 8: 'feet', 9: 'wrist', 10: 'hands',
  11: 'finger', 12: 'trinket', 16: 'back', 13: 'oneHand', 21: 'mainHand', 17: 'twoHand', 23: 'offHand', 15: 'ranged', 26: 'ranged', 19: 'tabard' };
const QUALITY = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'heirloom'];
const WEAPON = { 'weapons/daggers': 'dagger', 'weapons/staves': 'staff', 'weapons/one-handed-swords': 'sword', 'weapons/wands': 'wand' };
const TEST_NAME = /\(TEST\)|^Test\b|\bTEST\b|Deprecated|\bDEP\b|\(old\)|\bOLD\b|zzOLD|^QA /i;
const r2 = x => Math.round(x * 100) / 100;
const decode = t => String(t || '').replace(/ (?:Always up to date|A spell(?: from [^.]+)?)\.$/, '').replace(/&apos;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function stats(s) {
  const o = {
    sp: (s.splpwr || 0) + (s.spldmg || 0),                 // "damage and healing" and "damage" spell power
    shadowSp: s.shasplpwr || 0, fireSp: s.firsplpwr || 0,
    hitPct: r2((s.hitrtng || 0) / cb.ratingPerHitPct),
    critPct: r2((s.critstrkrtng || 0) / cb.ratingPerCritPct + (s.splcritstrkpct || 0)),
    hastePct: r2((s.hastertng || 0) / cb.ratingPerHastePct),
    // Round 210 (user: "make sure spell pierce is properly marked … and not wrongfully marked as spell penetration"): Wowhead's
    // key splpen is listed as "Spell Penetration", but every such Forever item's own tooltip says "Your spells pierce N
    // Magical Resistance" = Spell Pierce (the wording decides, A96). An item whose tooltip says "Decreases the magical
    // resistances of your spell targets by N" is Spell Penetration (moved below, PEN_TIP).
    pierce: s.splpen || 0,
    int: s.int || 0, spi: s.spi || 0, sta: s.sta || 0, mp5: s.manargn || 0,
  };
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  return o;
}
// The items' Forever tooltips (round 210, research/raw/forever-tooltips.json), as plain text: they decide Pierce / Penetration.
const TIP = {}, TIPH = {};
try { const tt = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/raw/forever-tooltips.json'), 'utf8')).tips || {}; Object.keys(tt).forEach(id => { TIP[id] = String(tt[id].h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); TIPH[id] = String(tt[id].h || ''); }); } catch (e) { /* no tooltips yet */ }
const PEN_TIP = /Equip: Decreases the magical resistances of your spell targets by \d+/;
const USEFUL = ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'spellPen', 'int', 'spi', 'mp5'];
function from(x) {                                         // a short "where it comes from", when Wowhead knows it
  const m = (x.sm || [])[0], src = x.src || [];
  if (src.indexOf(1) >= 0) return 'Crafted';
  // round 256 (user: "make it say vendor: pix xizzix"): Wowhead's NPC source of a vendor item is the vendor, not a drop
  if (m && m.n && m.t === 1) return (src.indexOf(5) >= 0 && src.indexOf(2) < 0 ? 'Vendor: ' : 'Drop: ') + m.n;
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
// Round 210: the content phase (data/item-phases.js): the user's review, else the latest phase its sources point to.
const PR = WL.PHASE_RULES || { zones: {}, npcs: {} };
function phaseOf(id, x, kind) {
  const set = (WL.ITEM_PHASE_SET || {})[id];
  if (set) return { p: set, why: 'user' };
  let p = 1, why = '';
  (x.sm || []).forEach(m => {
    const zid = m.z || (m.t === 5 ? m.c : 0), z = PR.zones[zid]; if (z && z > p) { p = z; why = 'zone ' + zid; }   // c = a quest's zone (for a recipe it is the profession list)
    const n = m.n && PR.npcs[m.n]; if (n && n > p) { p = n; why = m.n; }
  });
  if (kind === 'pvp' && PR.pvpRank > p) { p = PR.pvpRank; why = 'PvP rank'; }
  if (/Darkmoon/.test(x.n) && PR.darkmoon > p) { p = PR.darkmoon; why = 'Darkmoon Faire'; }
  return { p, why };
}
function raidOf(x) { const m = (x.sm || []).map(y => RAIDS[y.z] || RAIDS[y.c]).filter(Boolean)[0]; return m || ''; }

// Item sets for other classes: their pieces are out
const otherClassSet = {}, otherClassPiece = {};
(raw.sets || []).forEach(s => { if (s.rc && !(s.rc & WARLOCK_BIT)) { otherClassSet[s.id] = s.n; (s.p || []).forEach(id => { otherClassPiece[id] = s.n; }); } });

// Round 241 (item sync of 2026-11-22): an item counts toward a set only when the set's piece list names it. The crafted
// Demonheart Leggings / Gloves / Spaulders / Boots (273940–273943) carry set 2100 "Demonheart Raiment", but its tooltip lists
// six other ids (280882–280889, not on Wowhead yet): wearing them gives no set bonus. Set 345 "Champion's Threads" keeps its
// Robe and Gloves (272548, 272553) as before: Wowhead lists 4 pieces without them yet gives a (6) bonus, so they look like
// pieces in the game (not checked in game).
// Round 245 (user: "these are the ones that are available", the Wowhead Forever page of set 1681): that page lists
// 226905–226912 as Deathmist Raiment's pieces; our data's piece list (and the pieces' tooltips) name 226921–226928, ids
// without any source (left out, round 233) — so 226905–226912 count toward set 1681.
const SET_KEEP = { 345: [272548, 272553], 1681: [226905, 226906, 226907, 226908, 226909, 226910, 226911, 226912] };
const setPieces = {}; (raw.sets || []).forEach(s => { if (s.p && s.p.length) setPieces[s.id] = s.p; });
const setHas = (sid, id) => !setPieces[sid] || setPieces[sid].indexOf(id) >= 0 || (SET_KEEP[sid] || []).indexOf(id) >= 0;
const unlinked = [];
// Round 241: a unique-equipped category ("Unique-Equipped: Artisan's Tier (1)": at most 1 item of that category worn, across
// all slots): from the trinket tooltip in the item data (x.tt), else from the item's Forever tooltip. Plain "Unique-Equipped"
// (no category) stays `unique` (from mx).
function uniqueCat(x) {
  const m = String(x.tt || '').match(/Unique-Equipped: ([^\n(<]+?) \((\d+)\)/) || String(TIPH[x.id] || '').match(/Unique-Equipped: ([^\n(<]+?) \((\d+)\)/);
  return m ? { cat: decode(m[1].trim()), max: +m[2] } : null;
}

// Round 210: every icon keeps its place in the icon sheet (the names of the current data/item-db.js come first, unused ones
// included); new icons go at the end. So art/items/icons.jpg only needs new squares when new icons come.
const icons = [], iconAt = {};
try {
  const box0 = { window: {} }; box0.WL = box0.window.WL = {};
  require('vm').runInNewContext(fs.readFileSync(OUT, 'utf8'), box0);
  ((box0.WL.ITEM_ICONS || {}).names || []).forEach(n => { if (iconAt[n] == null) { iconAt[n] = icons.length; icons.push(n); } });
} catch (e) { /* no list yet */ }
const iconOf = ic => { ic = ic || 'inv_misc_questionmark'; if (iconAt[ic] == null) { iconAt[ic] = icons.length; icons.push(ic); } return iconAt[ic]; };
// Round 216 (user: "arcane crystal pendant is a mage item"): an item whose every source is another class's quest (Wowhead's
// quest category: -161 Mage, -262 Priest, …) carries no class flag, but a Warlock cannot get it — left out.
const CLASS_QUEST = { '-81': 'Warrior', '-82': 'Shaman', '-141': 'Paladin', '-161': 'Mage', '-162': 'Rogue', '-261': 'Hunter', '-262': 'Priest', '-263': 'Druid' };
const otherClassQuest = x => x.sm && x.sm.length && x.sm.every(s => s.t === 5 && CLASS_QUEST[s.c]);
const dropped = { otherClass: 0, otherClassSet: 0, otherClassQuest: 0, excluded: 0, test: 0, slot: 0, noStat: 0 }, items = {};
raw.items.slice().sort((a, b) => a.id - b.id).forEach(x => {
  if (EXCLUDE[x.id]) { dropped.excluded++; return; }
  if (x.rc && !(x.rc & WARLOCK_BIT) && !CLASS_OK[x.id]) { dropped.otherClass++; return; }   // round 254: CLASS_OK
  if (otherClassPiece[x.id] || otherClassSet[x.set]) { dropped.otherClassSet++; return; }
  if (otherClassQuest(x)) { dropped.otherClassQuest++; return; }
  if (TEST_NAME.test(x.n)) { dropped.test++; return; }
  const slot = SLOT[x.sl];
  if (!slot || !WL.GEAR_SLOTS.some(s => s.fits.indexOf(slot) >= 0)) { dropped.slot++; return; }
  let st = stats((STATS_FIX[x.id] && STATS_FIX[x.id].s) || x.s || {});
  const tfx = WL.TRINKET_FX && WL.TRINKET_FX[x.id];
  if (st.pierce && TIP[x.id] && PEN_TIP.test(TIP[x.id]) && !/Your spells pierce/.test(TIP[x.id])) { st.spellPen = st.pierce; delete st.pierce; }   // round 210
  if (tfx && tfx.stats) st = Object.assign({}, tfx.stats);   // round 209: a trinket's own stats where Wowhead's list counts a zone bonus always
  if (!USEFUL.some(k => st[k]) && !(WL.TRINKET_FX && WL.TRINKET_FX[x.id])) { dropped.noStat++; return; }   // round 166: a trinket with an effect in data/trinkets.js stays
  const it = { name: (STATS_FIX[x.id] && STATS_FIX[x.id].name) || x.n, slot, quality: QUALITY[x.q] || 'common', ilvl: x.l || 0, req: x.r || 0, stats: st, icon: iconOf(x.ic) };
  if (WEAPON[x.cat]) it.weapon = WEAPON[x.cat];
  if (x.set && setHas(x.set, x.id)) it.set = x.set; else if (x.set) unlinked.push(x.id + ' ' + x.n + ' (set ' + x.set + ')');   // round 241, item sync
  if (x.mx === 1) it.unique = true;
  const uc = uniqueCat(x); if (uc) { it.uniqueCat = uc.cat; it.uniqueMax = uc.max; }   // round 241, item sync
  const side = x.rr && !(x.rr & HORDE) ? 'Alliance' : x.rr && !(x.rr & ALLIANCE) ? 'Horde' : '';
  if (side) it.side = side;
  const f = FROM_FIX[x.id] || from(x); if (f) it.from = f;
  const sc = srcKind(x); if (sc) it.src = sc;
  const rd = raidOf(x); if (rd) it.raid = rd;
  const ph = phaseOf(x.id, x, sc); if (ph.p !== 1) it.phase = ph.p;   // round 210
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
    // round 166: "Attack Power +26 and +1% Critical Strike" (Might of the Scourge) is melee crit, not spell crit
    if (!/Attack Power|Ranged|Melee/i.test(n) || /Spell Crit/i.test(n)) set('critPct', num(/Crit(?:ical Strike)?(?: Chance)? \+(\d+)%|\+(\d+)% (?:Spell )?Crit/i, n));
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
// Round 166 (user: "make sure there's nothing that isn't usable or useful for warlock. for example i see the zg enchant for
// mages in there or hunters"): the Zul'Gurub head / leg enchants come from one class's quest each — only the Warlock's
// (Hoodoo Hex) stays. Hand-kept: the enchant data names no class.
const ZG_CLASS_ENCHANT = { 'Presence of Might': 'Warrior', "Syncretist's Sigil": 'Paladin', "Falcon's Call": 'Hunter', "Vodouisant's Vigilant Embrace": 'Shaman',
  'Presence of Sight': 'Mage', 'Hoodoo Hex': 'Warlock', 'Prophetic Aura': 'Priest', "Animist's Caress": 'Druid', "Death's Embrace": 'Rogue' };
// Stats a Warlock enchant can give the sim (round 166: Stamina too — it feeds health, Life Tap and Touch of the Grave);
// an enchant with none of them (resistances, armor, movement, melee-only, healing-only …) is left out.
const ENCH_USEFUL = USEFUL.concat(['sta']);
// round 216 (user: "show the enchant as a clickable thing too so it goes to the wowhead link"): the Wowhead page of an
// enchant — the item that applies it when it is not an Enchanting recipe (kit, arcanum: item=…), else its spell (spell=…)
const whOf = e => { const ench = /^Enchant/.test(e.from || ''); return e.item && !ench ? 'item=' + e.item : e.spell ? 'spell=' + e.spell : e.item ? 'item=' + e.item : null; };   // kits / arcanums: their item
const enchants = {}, enchDropped = { noSlot: 0, otherClass: 0, noStat: 0 };
(raw.enchants || []).forEach(e => {
  const text = decode(e.desc), slots = enchSlots(text);
  const name = /^\$/.test(e.n) ? decode(e.sn) : decode(e.n);       // an unfinished game text ("$@spelldesc…"): the item's name
  const src = /^Enchant /.test(e.from) ? 'Enchanting' : e.from;   // an enchanting scroll counts as Enchanting
  if (!slots.length) { enchDropped.noSlot++; return; }
  if (ZG_CLASS_ENCHANT[src] && ZG_CLASS_ENCHANT[src] !== 'Warlock') { enchDropped.otherClass++; return; }
  const cur = enchants[e.id];
  if (cur) {                                               // the same enchant from another recipe / item: more slots, more sources
    slots.forEach(s => { if (cur.slots.indexOf(s) < 0) cur.slots.push(s); });
    if (slots.indexOf('mainHand') >= 0) cur.mh.push(twoHandOnly(text));
    if (cur.from.indexOf(src) < 0) cur.from.push(src);
    if (!cur.wh) cur.wh = whOf(e);
    return;
  }
  const en = { name, slots, stats: enchStats(name, text), text, from: [src], icon: iconOf(e.ic), mh: slots.indexOf('mainHand') >= 0 ? [twoHandOnly(text)] : [] };
  const w = whOf(e); if (w) en.wh = w;
  enchants[e.id] = en;
});
Object.keys(enchants).forEach(id => { if (!ENCH_USEFUL.some(k => enchants[id].stats[k]) && !(WL.ENCHANT_FX && WL.ENCHANT_FX[id])) { delete enchants[id]; enchDropped.noStat++; } });   // round 166; round 167: an enchant with an effect in data/trinkets.js stays
Object.keys(enchants).forEach(id => { const e = enchants[id]; e.slots.sort((a, b) => WL.GEAR_SLOTS.findIndex(s => s.key === a) - WL.GEAR_SLOTS.findIndex(s => s.key === b)); e.from = e.from.join(', '); if (e.mh.length && e.mh.every(Boolean)) e.twoHand = true; delete e.mh; });   // twoHand: only on a two-handed weapon

// What changed since the last file
let old = {}, oldE = {};
try { const box = { window: {} }; box.WL = box.window.WL = {}; require('vm').runInNewContext(fs.readFileSync(OUT, 'utf8'), box); old = box.WL.ITEMS || {}; oldE = box.WL.ENCHANTS || {}; } catch (e) { old = {}; }
const diff = (now, before) => {
  const ids = Object.keys(now), oldIds = Object.keys(before), norm = o => JSON.stringify(Object.assign({}, o, { icon: 0 }));
  return { added: ids.filter(id => !before[id]), gone: oldIds.filter(id => !now[id]), changed: ids.filter(id => before[id] && norm(before[id]) !== norm(now[id])) };
};
const di = diff(items, old), de = diff(enchants, oldE);

// ---------- item sets (round 210, user: "start implementing the set bonuses for phase 1 items") ----------
// Every set with a piece in the list: its name, size, the pieces in the list and its bonuses from the pieces' tooltips
// ("(3) Set: …" with the bonus spell). A bonus's stats come from its text, in the item list's sense (Forever's plain "chance
// to hit / get a critical strike" is spell hit / crit, as on items); bonuses without a stat the sheet has (resistances,
// armor, speed, procs) carry only their text — the procs that matter are simulated from data/trinkets.js WL.SET_FX.
function setStats(text) {
  const o = {}, n = re => { const m = text.match(re); return m ? +m[1] : 0; };
  const put = (k, v) => { if (v) o[k] = (o[k] || 0) + v; };
  put('sp', n(/damage and healing done by magical spells and effects by up to (\d+)/i) || n(/damage done by spells and effects by up to (\d+)/i));
  put('hitPct', n(/Improves your chance to hit(?: with spells)? by ([\d.]+)%/i));
  put('critPct', n(/Improves your chance to get a critical strike(?: with spells)? by ([\d.]+)%/i));
  put('mp5', n(/Restores (\d+) mana per 5 sec/i));
  put('int', n(/^\+(\d+) Intellect\.?$/i)); put('spi', n(/^\+(\d+) Spirit\.?$/i)); put('sta', n(/^\+(\d+) Stamina\.?$/i));
  put('spellPen', n(/Decreases the magical resistances of your spell targets by (\d+)/i));
  put('pierce', n(/Your spells pierce (\d+) Magical Resistance/i));
  return o;
}
const setsById = {}; (raw.sets || []).forEach(s => { setsById[s.id] = s; });
const itemSets = {};
Object.keys(items).forEach(id => {
  const sid = items[id].set; if (!sid) return;
  const s = itemSets[sid] || (itemSets[sid] = { name: (setsById[sid] || {}).n || '', size: ((setsById[sid] || {}).p || []).length, items: [], bonuses: [] });
  s.items.push(+id);
  const h = TIPH[id] || '', re = /\((\d)\) Set ?:\s*(?:<a[^>]*spell=(\d+)[^>]*>)?([\s\S]*?)(?:<\/a>)?<\/span>/g, b = []; let m;
  while ((m = re.exec(h))) b.push({ n: +m[1], spell: +m[2] || 0, text: decode(m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) });
  if (b.length > s.bonuses.length) s.bonuses = b;
  const sz = h.match(/\(\d+\/(\d+)\)<\/span>/); if (sz) s.size = +sz[1];
});
// Round 211 (user, with an in-game tooltip of Dreadmist Belt: "these are the dreadmist set bonuses. and deathmist is the
// other way around, so the 2 piece deathmist is the 6 piece dreadmist etc"): the game's bonuses win over Wowhead's. Dreadmist
// (3) is 12 spell power in the game (Wowhead: 18); Deathmist had Dreadmist's bonuses in reverse order: (n) = Dreadmist (8 − n)
// — the quest pieces (set 518; user: "only keep the quest versions and put the set bonus i gave you on those"), in place of
// Wowhead's (2) resistances, (4) fear, (6) 23 spell power, (8) 200 armor. The vendor pieces (1681) are left out (EXCLUDE).
// Round 244 replaced Deathmist's with the reissued row 1681's; round 245 moved them to set 1681's own pieces (below).
// game: true → tools/gen-tooltips.js rewrites these sets' piece list and bonus lines in the item tooltips.
const SET_GAME = {
  183: [[2, 18679, '+8 All Resistances.'], [3, 9346, 'Increases damage and healing done by magical spells and effects by up to 12.'],
    [4, 27780, 'When struck in combat has a 2% chance of causing the attacker to flee in terror for 2 sec. Can only occur once every 60 sec.'],
    [5, 450585, 'Your spellcasts have a 5% chance to heal you for 270 to 330.'], [6, 18378, 'Restores 8 mana per 5 sec.']],
};
// Round 244 (the user's pick "Set procs: Necropile, Deathmist"; a public combat-log study, Forever): Deathmist wearers in the
// game fire set row 1681's bonuses: (2) +8 all resistances, (3) 8 MP5, (4) the heal proc, (5) the fear, (6) 23 spell power;
// round 244 put them on the Classic quest pieces (set 518). Rounds 211–243: Dreadmist's in reverse.
// Round 245 (user: "these are the ones that are available", the Wowhead Forever page of set 1681): the pieces are set 1681's
// own (226905–226912, above) and so are the bonuses — the same five as on that page. Our Wowhead tooltips of 226905–226912
// show the set as "(0/8)" with no bonus lines, so they are written here.
SET_GAME[1681] = [[2, 18679, '+8 All Resistances.'], [3, 18378, 'Restores 8 mana per 5 sec.'],
  [4, 450585, 'Your spellcasts have a 5% chance to heal you for 270 to 330.'],
  [5, 27780, 'When struck in combat has a 2% chance of causing the attacker to flee in terror for 2 sec. Can only occur once every 60 sec.'],
  [6, 14047, 'Increases damage and healing done by magical spells and effects by up to 23.']];
Object.keys(SET_GAME).forEach(sid => { if (itemSets[sid]) { itemSets[sid].bonuses = SET_GAME[sid].map(b => ({ n: b[0], spell: b[1], text: b[2] })); itemSets[sid].game = true; } });
Object.keys(itemSets).forEach(sid => itemSets[sid].bonuses.forEach(b => { const st = setStats(b.text); if (Object.keys(st).length) b.stats = st; }));
console.log('item sets: ' + Object.keys(itemSets).length + ', with bonuses ' + Object.keys(itemSets).filter(k => itemSets[k].bonuses.length).length);
if (unlinked.length) console.log('set links dropped (not in the set\'s piece list, round 241): ' + unlinked.join(', '));
const ucats = {}; Object.keys(items).forEach(id => { const c = items[id].uniqueCat; if (c) (ucats[c + ' (' + items[id].uniqueMax + ')'] = ucats[c + ' (' + items[id].uniqueMax + ')'] || []).push(id); });
if (Object.keys(ucats).length) console.log('unique-equipped categories: ' + Object.keys(ucats).map(c => c + ': ' + ucats[c].join(' ')).join('; '));

const ids = Object.keys(items), eids = Object.keys(enchants);
const head = '// GENERATED by tools/gen-items.js from the Wowhead Forever data (collected ' + String(raw.collected || '').slice(0, 10) + ') — do not edit by hand.\n' +
  '// The gear builder\'s lists: the items a Warlock can wear with at least one stat the sim uses, and every enchant.\n' +
  '// Formats: see data/items.js. icon = position in WL.ITEM_ICONS.names (art/items/icons.jpg, 36 px squares, 24 per row).\n' +
  'window.WL = window.WL || {};\n';
const body = 'WL.ITEM_DB = ' + JSON.stringify({ collected: String(raw.collected || '').slice(0, 10), count: ids.length, enchants: eids.length }) + ';\n' +
  'WL.ITEM_ICONS = ' + JSON.stringify({ file: 'art/items/icons.jpg', size: 36, cols: 24, names: icons }) + ';\n' +
  'WL.ITEMS = {\n' + ids.map(id => '  ' + id + ': ' + JSON.stringify(items[id])).join(',\n') + '\n};\n' +
  'WL.ENCHANTS = {\n' + eids.map(id => '  ' + id + ': ' + JSON.stringify(enchants[id])).join(',\n') + '\n};\n' +
  'WL.ITEM_SETS = {\n' + Object.keys(itemSets).map(id => '  ' + id + ': ' + JSON.stringify(itemSets[id])).join(',\n') + '\n};\n';   // round 210
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
