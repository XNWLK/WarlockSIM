// Gear builder maths (round 147): what you wear → the Stats panel's Sheet (gear) values. Page code only — the fight engine
// reads the resulting cfg.gear as always and knows nothing about items.
//
// cfg.gearBuilder = { on, slots: { <slot key>: entry }, enchants: { <slot key>: entry }, manual: { <stat>: number } }
//   item entry    = { id: <game item id> } for an item of WL.ITEMS, or { custom: { name, slot, stats, weapon } } for one you
//                   typed or brought in with a gear code (a custom item may keep its game `id`)
//   enchant entry = { id: <enchant id> } for one of WL.ENCHANTS, or { custom: { name, stats } } (round 148)
//   manual        = what you added by hand in the Stats panel on top of naked + items + enchants (0 when switched on)
// Sheet (gear) value of a stat = naked + items + enchants + manual, in the units of cfg.gear:
//   - naked: 0 for everything except spell crit. The sheet's crit is the character-sheet total (base 1.7% + Intellect / 60
//     + gear), so a naked Warlock already has 1.7% + 110 / 60 = 3.53%. Base Intellect, Spirit and Stamina (class
//     + race) are not in the sheet column: the sim adds them on top, as it always has (Total column).
//   - Intellect from items, enchants and what you add by hand raises the sheet's crit by Int / 60, as on the character sheet.
//   - An enchant only counts while its slot holds an item that counts.
window.WL = window.WL || {};

WL.gearSlot = function (key) { return WL.GEAR_SLOTS.filter(function (s) { return s.key === key; })[0] || null; };

// The item in a slot entry, or null (empty, or an id this page does not know).
WL.gearItem = function (entry) {
  if (!entry) return null;
  if (entry.custom) return entry.custom;
  return entry.id != null && WL.ITEMS[entry.id] ? WL.ITEMS[entry.id] : null;
};
// The enchant in an enchant entry, or null.
WL.gearEnchant = function (entry) {
  if (!entry) return null;
  if (entry.custom) return entry.custom;
  return entry.id != null && WL.ENCHANTS[entry.id] ? WL.ENCHANTS[entry.id] : null;
};

// Can this item go into this slot?
WL.gearFits = function (slotKey, item) {
  var s = WL.gearSlot(slotKey);
  return !!(s && item && s.fits.indexOf(item.slot) >= 0);
};

// A two-handed weapon in the main hand leaves the off hand empty.
WL.gearOffHandBlocked = function (gb) {
  var mh = WL.gearItem(((gb || {}).slots || {}).mainHand);
  return !!(mh && mh.slot === 'twoHand');
};

// Round 252 (user, 2026-11-25: "make the gear builder load the +65 enchant with the staff. 65 spellpower isn't expensive
// anymore so it's the default enchant for all 2handers"): +65 Spell Power (7662) is the weapon enchant a two-hander gets.
WL.TWO_HAND_ENCHANT = 7662;
// The main hand's enchant entry once `item` (an item, or a WL.ITEMS id) is in the main hand, from the entry on it now (`cur`;
// an entry, or an enchant id):
//   - a two-hander keeps an enchant made for two-handed weapons only (+65 Spell Power, Spell Power +55, Grand Arcanist …) or
//     one you typed in yourself; anything else (none, Revelation, a one-hand enchant, an id this page does not know) →
//     +65 Spell Power;
//   - a one-hander loses an enchant made for two-handed weapons only (null: no enchant); any other stays;
//   - no item: the entry stays (an enchant only counts while its slot holds an item).
WL.weaponEnchantFor = function (item, cur) {
  if (item != null && typeof item !== 'object') item = WL.ITEMS[item] || null;
  if (cur != null && typeof cur !== 'object') cur = { id: +cur };
  var en = cur && !cur.custom && cur.id != null ? WL.ENCHANTS[cur.id] : null;
  if (!item) return cur || null;
  if (item.slot === 'twoHand') return cur && (cur.custom || (en && en.twoHand)) ? cur : { id: WL.TWO_HAND_ENCHANT };
  return en && en.twoHand ? null : cur || null;
};
// After an item went into the main hand of the gear-builder state `gb` (changed in place, and returned): its enchant by
// WL.weaponEnchantFor, and with a two-hander the off hand and its enchant come off, as in the game.
WL.gearFixWeapon = function (gb) {
  var slots = gb.slots = gb.slots || {}, ench = gb.enchants = gb.enchants || {}, it = WL.gearItem(slots.mainHand);
  if (!it) return gb;
  var e = WL.weaponEnchantFor(it, ench.mainHand || null);
  if (e) ench.mainHand = e; else delete ench.mainHand;
  if (it.slot === 'twoHand') { delete slots.offHand; delete ench.offHand; }
  return gb;
};

WL.gearNaked = function (cfg) {
  var o = {}; WL.GEAR_STAT_KEYS.forEach(function (k) { o[k] = 0; });
  o.critPct = cfg.combat.baseCritPct + WL.WARLOCK_BASE_60.int * cfg.combat.critPerInt;
  return o;
};

WL.gearRound = function (x) { return Math.round(x * 100) / 100; };   // the sheet shows two decimals

// Round 210 (user: "start implementing the set bonuses for phase 1 items"): the item sets you wear (WL.ITEM_SETS, data/item-db.js) —
// per set the pieces worn (each item once) and its bonuses that count: [{ id, name, size, worn, bonuses: [{ n, text, stats, on }] }].
// Only items that count (fit their slot; not an off-hand blocked by a two-handed weapon).
WL.gearSets = function (gb) {
  var S = WL.ITEM_SETS || {}, slots = (gb || {}).slots || {}, blocked = WL.gearOffHandBlocked(gb), by = {}, seen = {};
  WL.GEAR_SLOTS.forEach(function (s) {
    var e = slots[s.key], it = WL.gearItem(e), id = e && !e.custom ? e.id : it && it.id;
    if (!it || !it.set || !S[it.set] || !WL.gearFits(s.key, it) || (s.key === 'offHand' && blocked) || seen[id]) return;
    seen[id] = 1; by[it.set] = (by[it.set] || 0) + 1;
  });
  return Object.keys(by).map(function (sid) {
    var s = S[sid], n = by[sid];
    return { id: +sid, name: s.name, size: s.size, worn: n, bonuses: (s.bonuses || []).map(function (b) { return { n: b.n, text: b.text, stats: b.stats || null, spell: b.spell, on: n >= b.n }; }) };
  });
};

// Round 241 (item sync): a unique-equipped category ("Unique-Equipped: Artisan's Tier (1)", item.uniqueCat / uniqueMax from
// tools/gen-items.js): at most uniqueMax items of the category worn at once, across all slots. Only items that count.
// gearUniqueWorn: per category the worn items, except slot `skip` → { cat: [{ slot, name, max }] }.
WL.gearUniqueWorn = function (gb, skip) {
  var slots = (gb || {}).slots || {}, blocked = WL.gearOffHandBlocked(gb), by = {};
  WL.GEAR_SLOTS.forEach(function (s) {
    var it = WL.gearItem(slots[s.key]);
    if (s.key === skip || !it || !it.uniqueCat || !WL.gearFits(s.key, it) || (s.key === 'offHand' && blocked)) return;
    (by[it.uniqueCat] = by[it.uniqueCat] || []).push({ slot: s.key, name: it.name, max: it.uniqueMax || 1 });
  });
  return by;
};
// The categories worn more often than they may be: [{ cat, max, names }].
WL.gearUniqueOver = function (gb) {
  var by = WL.gearUniqueWorn(gb);
  return Object.keys(by).filter(function (c) { return by[c].length > by[c][0].max; })
    .map(function (c) { return { cat: c, max: by[c][0].max, names: by[c].map(function (x) { return x.name; }) }; });
};
// May the gear `after` replace `now` (the gear optimizer, round 241 review)? Every category at most max(its limit, how many of
// it `now` wears): a combination may keep a category you already wear too often, but never add to one or break another.
WL.gearUniqueAllowed = function (now, after) {
  var a = WL.gearUniqueWorn(now), b = WL.gearUniqueWorn(after);
  return Object.keys(b).every(function (c) { return b[c].length <= Math.max(b[c][0].max, (a[c] || []).length); });
};
// Putting `item` into `slotKey`: the warning when that wears more of its category than allowed, else ''.
// Round 241 review: judged on the gear with the item put in, so a two-hander going into the main hand no longer counts what
// still sits in the off hand, and an item going into an off hand that a two-hander blocks does not count at all.
WL.gearUniqueWarn = function (gb, slotKey, item) {
  if (!item || !item.uniqueCat) return '';
  var after = JSON.parse(JSON.stringify(gb || {})); after.slots = after.slots || {}; after.slots[slotKey] = { custom: item };
  if (slotKey === 'offHand' && WL.gearOffHandBlocked(after)) return '';
  var max = item.uniqueMax || 1, worn = WL.gearUniqueWorn(after, slotKey)[item.uniqueCat] || [];
  if (worn.length < max) return '';
  return 'Unique-Equipped: ' + item.uniqueCat + ' (' + max + '): you already wear ' + worn.map(function (x) { return x.name; }).join(', ');
};
// The gear builder's unique warnings for putting item `id` into `slotKey` (moved here from app.js in the round 241 review):
// "Unique" when the same item sits in the other ring / trinket slot; else the unique-equipped category's warning. An item
// that is both (Signet Ring of the Bronze Dragonflight) warns once.
WL.gearUniqueWarnings = function (gb, slotKey, id, item) {
  var other = { finger1: 'finger2', finger2: 'finger1', trinket1: 'trinket2', trinket2: 'trinket1' }[slotKey];
  var o = other && ((gb || {}).slots || {})[other];
  if (item && item.unique && o && String(o.id) === String(id)) return ['Unique: you already wear it in the other slot'];
  var uw = WL.gearUniqueWarn(gb, slotKey, item);
  return uw ? [uw] : [];
};

// Everything the builder shows: per stat the naked value, the items' sum, the enchants' sum, your own additions and the
// resulting sheet value (rounded to 2 decimals); `crit from Int` separately; which slots / enchants count. (Until round 149
// also the main hand's weapon type, for Sword Specialization; Ruthless needs no sword.)
WL.gearSheet = function (gb, cfg) {
  gb = gb || {}; var slots = gb.slots || {}, ench = gb.enchants || {}, manual = gb.manual || {};
  var naked = WL.gearNaked(cfg), items = {}, enchants = {}, sets = {}, mine = {}, sheet = {}, used = [], enchUsed = [];
  WL.GEAR_STAT_KEYS.forEach(function (k) { items[k] = 0; enchants[k] = 0; sets[k] = 0; mine[k] = +manual[k] || 0; });
  var blocked = WL.gearOffHandBlocked(gb);
  var add = function (to, stats) { WL.GEAR_STAT_KEYS.forEach(function (k) { var v = +((stats || {})[k]); if (isFinite(v)) to[k] += v; }); };
  WL.GEAR_SLOTS.forEach(function (s) {
    var it = WL.gearItem(slots[s.key]);
    if (!it || !WL.gearFits(s.key, it) || (s.key === 'offHand' && blocked)) return;
    used.push(s.key); add(items, it.stats);
    var en = s.enchant ? WL.gearEnchant(ench[s.key]) : null;
    if (en) { enchUsed.push(s.key); add(enchants, en.stats); }
  });
  var setList = WL.gearSets(gb);                                    // round 210: set bonuses that count
  setList.forEach(function (s) { s.bonuses.forEach(function (b) { if (b.on && b.stats) add(sets, b.stats); }); });
  var critFromInt = (items.int + enchants.int + sets.int + mine.int) * cfg.combat.critPerInt;
  WL.GEAR_STAT_KEYS.forEach(function (k) { sheet[k] = WL.gearRound(naked[k] + items[k] + enchants[k] + sets[k] + mine[k] + (k === 'critPct' ? critFromInt : 0)); });
  return { naked: naked, items: items, enchants: enchants, sets: sets, setList: setList, manual: mine, critFromInt: critFromInt, sheet: sheet, used: used, enchUsed: enchUsed,
           offHandBlocked: blocked };
};

// You typed `value` into the Stats panel for stat k while the builder is on: what you added by hand becomes the difference
// to naked + items + enchants (+ crit from Int). Changing Intellect by hand also moves the sheet's crit.
WL.gearManualFor = function (gb, cfg, k, value) {
  var r = WL.gearSheet(gb, cfg), base = r.naked[k] + r.items[k] + r.enchants[k] + r.sets[k];
  if (k === 'critPct') base += (r.items.int + r.enchants.int + r.sets.int + (r.manual.int || 0)) * cfg.combat.critPerInt;
  return Math.round((value - base) * 10000) / 10000;
};

// Round 148: what the Sheet (gear) values change by when `entry` goes into slot `slotKey` (null = take it off), with
// everything else as worn — the slot's enchant stays, a two-handed weapon empties the off hand. Works whether the builder
// is on or off: add the result to cfg.gear. Round 252: a weapon going into the main hand gets its enchant as the gear
// builder puts it on (WL.gearFixWeapon: a two-hander +65 Spell Power unless it keeps a two-hand enchant).
WL.gearSwapDelta = function (gb, slotKey, entry, cfg) {
  var after = JSON.parse(JSON.stringify(gb || {})); after.slots = after.slots || {};
  if (entry) after.slots[slotKey] = entry; else delete after.slots[slotKey];
  if (entry && slotKey === 'mainHand' && JSON.stringify(entry) !== JSON.stringify(((gb || {}).slots || {}).mainHand || null)) WL.gearFixWeapon(after);
  var a = WL.gearSheet(gb, cfg), b = WL.gearSheet(after, cfg), d = {};
  WL.GEAR_STAT_KEYS.forEach(function (k) { d[k] = WL.gearRound(b.sheet[k] - a.sheet[k]); });
  return { delta: d };
};

// Round 148: an item's (or enchant's) worth for a build from its stat weights (DPS per 1 of each stat, as in the results
// table), in DPS and in spell power. Intellect's weight already holds the crit it gives, so the item's own stats are used.
// Shadow / Fire spell power count as spell power times the share of the build's damage done by your own spells of that
// school (`share` = { shadow, fire }, 0–1). Spirit, Stamina and MP5 have no weight: listed in `unvalued`.
WL.gearValue = function (stats, w, share) {
  stats = stats || {}; share = share || {};
  var per = { sp: w.sp, hitPct: w.hitPct, critPct: w.critPct, hastePct: w.hastePct, int: w.int, pierce: w.pierce, spellPen: w.spellPen, spi: w.spi, mp5: w.mp5,   // round 157: the last three when computed
              shadowSp: w.sp * (share.shadow || 0), fireSp: w.sp * (share.fire || 0) };
  var dps = 0, unvalued = [];
  WL.GEAR_STAT_KEYS.forEach(function (k) {
    var v = +stats[k]; if (!v || !isFinite(v)) return;
    if (per[k] == null || !isFinite(per[k])) unvalued.push(k); else dps += v * per[k];
  });
  return { dps: dps, sp: w.sp > 0 ? dps / w.sp : null, unvalued: unvalued };
};

// ---------- gear code (round 148): your gear as a line of text, made by the in-game addon or by this page ----------
// "WFG1:" + base64(UTF-8 JSON) — the same wrapping as settings codes (WFS1:). JSON:
//   { v: 1,
//     items:    { <slot key>: { id, name, slot, quality, weapon, stats: { <stat>: n } } },
//     enchants: { <slot key>: { id, name, stats } } }
// Slot keys = WL.GEAR_SLOTS keys (each also names its game inventory slot number, `inv`). stats in the units of the Sheet
// (gear) values: spell power in points, hit / crit / haste in % as the tooltip shows them. Only `name` or a known `id` is
// needed per entry; missing stats = 0, a missing item slot type = the slot's first type. An id this page knows (WL.ITEMS /
// WL.ENCHANTS) is used as listed; any other entry comes in with the name and stats it carries.
WL.GEAR_CODE_PREFIX = 'WFG1:';
(function () {
  function cleanStats(s) {
    var o = {}; WL.GEAR_STAT_KEYS.forEach(function (k) { var v = +((s || {})[k]); if (v && isFinite(v)) o[k] = v; });
    return o;
  }
  WL.encodeGear = function (gb) {
    gb = gb || {}; var out = { v: 1, items: {}, enchants: {} };
    Object.keys(gb.slots || {}).forEach(function (k) {
      var e = gb.slots[k], it = WL.gearItem(e); if (!it || !WL.gearSlot(k)) return;
      var o = { name: it.name, slot: it.slot, stats: cleanStats(it.stats) };
      var id = e.id != null ? e.id : it.id; if (id != null) o.id = id;
      if (it.quality) o.quality = it.quality; if (it.weapon) o.weapon = it.weapon;
      out.items[k] = o;
    });
    Object.keys(gb.enchants || {}).forEach(function (k) {
      var e = gb.enchants[k], en = WL.gearEnchant(e); if (!en || !(WL.gearSlot(k) || {}).enchant) return;
      var o = { name: en.name, stats: cleanStats(en.stats) }, id = e.id != null ? e.id : en.id; if (id != null) o.id = id;
      out.enchants[k] = o;
    });
    return WL.GEAR_CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(out))));
  };
  // → { slots, enchants, ignored: [names of what could not be used] }; throws on a code that is not a gear code.
  WL.decodeGear = function (code) {
    var s = String(code || '').replace(/\s+/g, ''), o;
    if (s.indexOf(WL.GEAR_CODE_PREFIX) !== 0) throw new Error('Not a gear code (it must start with ' + WL.GEAR_CODE_PREFIX + ')');
    try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(WL.GEAR_CODE_PREFIX.length))))); }
    catch (e) { throw new Error('The gear code is damaged (could not be decoded)'); }
    if (!o || o.v !== 1) throw new Error('Unknown gear-code version');
    var slots = {}, enchants = {}, ignored = [];
    Object.keys(o.items || {}).forEach(function (k) {
      var x = o.items[k] || {}, sl = WL.gearSlot(k);
      if (!sl) { ignored.push('slot "' + k + '"'); return; }
      if (x.id != null && WL.ITEMS[x.id]) { slots[k] = { id: x.id }; return; }
      if (!x.name) { ignored.push(sl.name + ' (no name)'); return; }
      var it = { name: String(x.name).slice(0, 80), slot: sl.fits.indexOf(x.slot) >= 0 ? x.slot : sl.fits[0], stats: cleanStats(x.stats) };
      if (x.id != null) it.id = x.id; if (x.quality) it.quality = String(x.quality); if (x.weapon) it.weapon = String(x.weapon);
      slots[k] = { custom: it };
    });
    Object.keys(o.enchants || {}).forEach(function (k) {
      var x = o.enchants[k] || {}, sl = WL.gearSlot(k);
      if (!sl || !sl.enchant) { ignored.push('enchant on "' + k + '"'); return; }
      if (x.id != null && WL.ENCHANTS[x.id]) { enchants[k] = { id: x.id }; return; }
      if (!x.name) { ignored.push(sl.name + ' enchant (no name)'); return; }
      var en = { name: String(x.name).slice(0, 80), stats: cleanStats(x.stats) }; if (x.id != null) en.id = x.id;
      enchants[k] = { custom: en };
    });
    // Round 157: the items in the bags (the in-game addon's "Bags too"), as slot entries — a listed item by its id, any other
    // with the name and stats it carries. Only what fits a Warlock slot type and has a stat of the sheet; the addon sends
    // every equippable item, so an item that is not in the list may still be one a Warlock cannot wear (flagged `unlisted`).
    var bag = [], seen = {};
    (Array.isArray(o.bag) ? o.bag : []).forEach(function (x) {
      if (!x) return;
      var key = x.id != null ? 'i' + x.id : 'n' + x.name; if (seen[key]) return;
      if (x.id != null && WL.ITEMS[x.id]) { seen[key] = 1; bag.push({ id: +x.id }); return; }
      var st = cleanStats(x.stats), types = WL.GEAR_SLOTS.reduce(function (a, s) { return a.concat(s.fits); }, []);
      if (!x.name || types.indexOf(x.slot) < 0 || !Object.keys(st).some(function (k) { return k !== 'sta'; })) return;
      var it = { name: String(x.name).slice(0, 80), slot: x.slot, stats: st, unlisted: true };
      if (x.id != null) it.id = x.id; if (x.quality) it.quality = String(x.quality); if (x.weapon) it.weapon = String(x.weapon);
      seen[key] = 1; bag.push({ custom: it });
    });
    return { slots: slots, enchants: enchants, ignored: ignored, bag: bag };
  };
})();
