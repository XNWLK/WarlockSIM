// Round 254 tests — the user, 2026-11-25: "https://www.wowhead.com/forever/item=272393/magicians-cord is now usable by
// warlocks as well. do the calculations and update the sim and the bis list".
//  * Magician's Cord (272393) was missing: Wowhead Forever names it Mage only (classes 128), so tools/items-collect.js left
//    it out of the item list. tools/gen-items.js now adds it (EXTRA, from its Wowhead Forever page and tooltip, read
//    2026-11-25) and keeps it despite the class mask (CLASS_OK; tools/items-collect.js keeps it too from now on).
//    Epic, item level 60, Requires Level 60, waist, cloth: +19 spell damage and healing, +24 Intellect, +12 Stamina; sold by
//    Pix Xizzix (Undermine Trader) like the other Undermine items, Phase 1.
//  * Its tooltip (tools/gen-tooltips.js FIX): "Classes: Mage, Warlock".
(function () {
  var CORD = 272393;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }

  T.run('round 254: Magician\'s Cord in the item list', function () {
    var it = WL.ITEMS[CORD];
    T.ok(!!it, 'item 272393 is in the gear builder\'s list');
    if (!it) return;
    T.eq(it.name, 'Magician\'s Cord', 'name');
    T.eq(it.slot, 'waist', 'waist');
    T.eq(it.quality, 'epic', 'epic');
    T.eq(it.ilvl, 60, 'item level 60');
    T.eq(it.req, 60, 'requires level 60');
    T.eq(JSON.stringify(it.stats), JSON.stringify({ sp: 19, int: 24, sta: 12 }), '+19 spell damage and healing, +24 Intellect, +12 Stamina (no hit, crit or Spirit)');
    T.eq(it.phase || 1, 1, 'Phase 1');
    T.ok(!it.raid && !it.set && !it.unique && !it.uniqueCat && !it.side, 'not from a raid, no set, not unique, both factions');
    T.eq(it.src, 'vendor', 'a vendor item (Undermine currency)');
    T.eq(it.from, WL.ITEMS[272411].from, 'source as the other Pix Xizzix items (Arcanoweave Cloak): ' + it.from);
    T.ok(WL.gearFits('waist', it), 'fits the waist slot of the gear builder');
    var icons = (WL.ITEM_ICONS || {}).names || [];
    T.eq(icons[it.icon], 'inv_belt_43a', 'its icon (already in the icon sheet)');
    var tip = (WL.ITEM_TIPS || {})[CORD];
    if (tip == null) T.warn('item tooltips not loaded here'); else {
      T.ok(/<b class="q4">Magician's Cord<\/b>/.test(tip) && /\+24 Intellect/.test(tip) && /\+12 Stamina/.test(tip) && /Requires Level 60/.test(tip), 'tooltip: epic name, Intellect, Stamina, level');
      T.ok(/up to 19\./.test(tip.replace(/<\/?span>/g, '')), 'tooltip: its Equip line (+19)');
      T.ok(/Classes: Mage, Warlock/.test(tip), 'tooltip: Classes: Mage, Warlock (user: "now usable by warlocks as well")');
    }
  });

  // The fights (page defaults, 12 seeds × 5,000, paired): Magician's Cord vs each list's waist — Realistic −0.3 … −1.8,
  // Max (Belt of the Archmage) −5.0 … −7.2 DPS. No list changes; the BiS page shows it as Ban'thok Sash's ▼ alternative.
  var KEYS = ['demo_pact_succ_sb', 'demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds', 'wrack_ds'];
  var BANTHOK = 11662, ARCHMAGE = 18405, MASTERS = 10255, WAISTCORD = 254087;
  T.run('round 254: the lists keep their waist', function () {
    KEYS.forEach(function (k) {
      T.eq(WL.PRE_RAID_BIS[k].waist, k === 'wrack_ds' ? MASTERS : BANTHOK, 'Realistic ' + k + ': ' + WL.ITEMS[WL.PRE_RAID_BIS[k].waist].name + ' (the Cord: −0.3 … −1.8 DPS)');
      T.eq(WL.MAX_PRE_RAID_BIS[k].waist, ARCHMAGE, 'Max ' + k + ': Belt of the Archmage (the Cord: −5.0 … −7.2 DPS)');
      T.eq(WL.PRE_BIS_GEAR[k].slots.waist, WL.PRE_RAID_BIS[k].waist, 'generated Realistic gear ' + k + ': the same waist');
      T.eq(WL.MAX_BIS_GEAR[k].slots.waist, ARCHMAGE, 'generated Max gear ' + k + ': the same waist');
    });
  });

  T.run('round 254: the BiS page (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json');
    if (!nt || !dj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports;
    // round 255: no hand pick any more — the Cord is ▼ by rule (notes.js CHEAP_OK; test-round255.js)
    T.ok(N.ALT[BANTHOK] === CORD || !!(N.CHEAP_OK || {})[CORD], 'notes.js: ▼ of Ban\'thok Sash = Magician\'s Cord (by hand, or by rule since round 255)');
    T.eq(N.ALT[MASTERS], WAISTCORD, 'notes.js: Wrack DS keeps the user\'s Black Waistcord under Master\'s Belt');
    T.ok(!N.EXCLUDE[CORD], 'not excluded');
    var D = JSON.parse(dj);
    D.builds.forEach(function (b) {
      var a = b.alts.waist || {};
      T.ok(a.up && a.up.id === ARCHMAGE, b.key + ': ▲ Belt of the Archmage stays');
      if (b.key === 'wrack_ds') T.ok(a.alt && a.alt.id === WAISTCORD, 'wrack_ds: ▼ Black Waistcord stays');
      else T.ok(a.alt && a.alt.id === CORD && a.alt.dps < 0 && a.alt.dps > -3, b.key + ': ▼ Magician\'s Cord (' + (a.alt && a.alt.dps) + ' DPS)');
    });
    T.ok(D.items[CORD] && D.items[CORD].name === 'Magician\'s Cord' && D.items[CORD].q === 'epic' && /Classes: Mage, Warlock/.test(D.items[CORD].tip), 'data.json: its item entry with the tooltip');
  });

  T.run('round 254: the class filter keeps it (tools)', function () {
    var gi = src('../tools/gen-items.js'), ic = src('../tools/items-collect.js');
    if (!gi || !ic) { T.warn('tools/ not readable here (file://)'); return; }
    T.ok(/const CLASS_OK = \{ 272393:/.test(gi) && /!\(x\.rc & WARLOCK_BIT\) && !CLASS_OK\[x\.id\]/.test(gi), 'gen-items.js: CLASS_OK keeps 272393 despite its class mask');
    T.ok(/\{ id: 272393, n: "Magician's Cord"/.test(gi), 'gen-items.js: EXTRA record (missing from the collected Wowhead list)');
    T.ok(/const CLASS_OK = \[272393\]/.test(ic) && /CLASS_OK\.indexOf\(x\.id\) < 0/.test(ic), 'items-collect.js: a new item sync keeps it too');
  });
})();
