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

WL.gearNaked = function (cfg) {
  var o = {}; WL.GEAR_STAT_KEYS.forEach(function (k) { o[k] = 0; });
  o.critPct = cfg.combat.baseCritPct + WL.WARLOCK_BASE_60.int * cfg.combat.critPerInt;
  return o;
};

WL.gearRound = function (x) { return Math.round(x * 100) / 100; };   // the sheet shows two decimals

// Everything the builder shows: per stat the naked value, the items' sum, the enchants' sum, your own additions and the
// resulting sheet value (rounded to 2 decimals); `crit from Int` separately; which slots / enchants count. (Until round 149
// also the main hand's weapon type, for Sword Specialization; Ruthless needs no sword.)
WL.gearSheet = function (gb, cfg) {
  gb = gb || {}; var slots = gb.slots || {}, ench = gb.enchants || {}, manual = gb.manual || {};
  var naked = WL.gearNaked(cfg), items = {}, enchants = {}, mine = {}, sheet = {}, used = [], enchUsed = [];
  WL.GEAR_STAT_KEYS.forEach(function (k) { items[k] = 0; enchants[k] = 0; mine[k] = +manual[k] || 0; });
  var blocked = WL.gearOffHandBlocked(gb);
  var add = function (to, stats) { WL.GEAR_STAT_KEYS.forEach(function (k) { var v = +((stats || {})[k]); if (isFinite(v)) to[k] += v; }); };
  WL.GEAR_SLOTS.forEach(function (s) {
    var it = WL.gearItem(slots[s.key]);
    if (!it || !WL.gearFits(s.key, it) || (s.key === 'offHand' && blocked)) return;
    used.push(s.key); add(items, it.stats);
    var en = s.enchant ? WL.gearEnchant(ench[s.key]) : null;
    if (en) { enchUsed.push(s.key); add(enchants, en.stats); }
  });
  var critFromInt = (items.int + enchants.int + mine.int) * cfg.combat.critPerInt;
  WL.GEAR_STAT_KEYS.forEach(function (k) { sheet[k] = WL.gearRound(naked[k] + items[k] + enchants[k] + mine[k] + (k === 'critPct' ? critFromInt : 0)); });
  return { naked: naked, items: items, enchants: enchants, manual: mine, critFromInt: critFromInt, sheet: sheet, used: used, enchUsed: enchUsed,
           offHandBlocked: blocked };
};

// You typed `value` into the Stats panel for stat k while the builder is on: what you added by hand becomes the difference
// to naked + items + enchants (+ crit from Int). Changing Intellect by hand also moves the sheet's crit.
WL.gearManualFor = function (gb, cfg, k, value) {
  var r = WL.gearSheet(gb, cfg), base = r.naked[k] + r.items[k] + r.enchants[k];
  if (k === 'critPct') base += (r.items.int + r.enchants.int + (r.manual.int || 0)) * cfg.combat.critPerInt;
  return Math.round((value - base) * 10000) / 10000;
};

// Round 148: what the Sheet (gear) values change by when `entry` goes into slot `slotKey` (null = take it off), with
// everything else as worn — the slot's enchant stays, a two-handed weapon empties the off hand. Works whether the builder
// is on or off: add the result to cfg.gear.
WL.gearSwapDelta = function (gb, slotKey, entry, cfg) {
  var after = JSON.parse(JSON.stringify(gb || {})); after.slots = after.slots || {};
  if (entry) after.slots[slotKey] = entry; else delete after.slots[slotKey];
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
  var per = { sp: w.sp, hitPct: w.hitPct, critPct: w.critPct, hastePct: w.hastePct, int: w.int, pierce: w.pierce,
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
    return { slots: slots, enchants: enchants, ignored: ignored };
  };
})();
