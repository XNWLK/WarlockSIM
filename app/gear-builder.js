// Gear builder maths (round 147): what you wear → the Stats panel's Sheet (gear) values. Page code only — the fight engine
// reads the resulting cfg.gear as always and knows nothing about items.
//
// cfg.gearBuilder = { on, slots: { <slot key>: entry }, manual: { <stat>: number } }
//   entry  = { id: <game item id> } for an item of WL.ITEMS, or { custom: { name, slot, stats, weapon } } for one you typed
//   manual = what you added by hand in the Stats panel on top of naked + items (0 when the builder is switched on)
// Sheet (gear) value of a stat = naked + items + manual, in the units of cfg.gear:
//   - naked: 0 for everything except spell crit. The sheet's crit is the character-sheet total (base 1.7% + Intellect / 60
//     + gear), so a naked Warlock already has 1.7% + 110 / 60 = 3.53%. Base Intellect, Spirit, Stamina and Agility (class
//     + race) are not in the sheet column: the sim adds them on top, as it always has (Total column).
//   - Intellect from items (and Intellect you add by hand) raises the sheet's crit by Int / 60, as on the character sheet.
window.WL = window.WL || {};

WL.gearSlot = function (key) { return WL.GEAR_SLOTS.filter(function (s) { return s.key === key; })[0] || null; };

// The item in a slot entry, or null (empty, or an id this page does not know).
WL.gearItem = function (entry) {
  if (!entry) return null;
  if (entry.custom) return entry.custom;
  return entry.id != null && WL.ITEMS[entry.id] ? WL.ITEMS[entry.id] : null;
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

// Everything the builder shows: per stat the naked value, the items' sum, your own additions and the resulting sheet value
// (rounded to 2 decimals); `crit from Int` separately; which slots count; and the main hand's weapon type for Sword
// Specialization (true / false, or null when the main hand says nothing about it).
WL.gearSheet = function (gb, cfg) {
  gb = gb || {}; var slots = gb.slots || {}, manual = gb.manual || {};
  var naked = WL.gearNaked(cfg), items = {}, mine = {}, sheet = {}, used = [];
  WL.GEAR_STAT_KEYS.forEach(function (k) { items[k] = 0; mine[k] = +manual[k] || 0; });
  var blocked = WL.gearOffHandBlocked(gb);
  WL.GEAR_SLOTS.forEach(function (s) {
    var it = WL.gearItem(slots[s.key]);
    if (!it || !WL.gearFits(s.key, it) || (s.key === 'offHand' && blocked)) return;
    used.push(s.key);
    WL.GEAR_STAT_KEYS.forEach(function (k) { var v = +((it.stats || {})[k]); if (isFinite(v)) items[k] += v; });
  });
  var critFromInt = (items.int + mine.int) * cfg.combat.critPerInt;
  WL.GEAR_STAT_KEYS.forEach(function (k) { sheet[k] = WL.gearRound(naked[k] + items[k] + mine[k] + (k === 'critPct' ? critFromInt : 0)); });
  var mh = used.indexOf('mainHand') >= 0 ? WL.gearItem(slots.mainHand) : null;
  return { naked: naked, items: items, manual: mine, critFromInt: critFromInt, sheet: sheet, used: used, offHandBlocked: blocked,
           sword: mh && mh.weapon ? mh.weapon === 'sword' : null };
};

// You typed `value` into the Stats panel for stat k while the builder is on: what you added by hand becomes the difference
// to naked + items (+ crit from Int). Changing Intellect by hand also moves the sheet's crit, as on the character sheet.
WL.gearManualFor = function (gb, cfg, k, value) {
  var r = WL.gearSheet(gb, cfg), base = r.naked[k] + r.items[k];
  if (k === 'critPct') base += r.items.int * cfg.combat.critPerInt + (r.manual.int || 0) * cfg.combat.critPerInt;
  return Math.round((value - base) * 10000) / 10000;
};
