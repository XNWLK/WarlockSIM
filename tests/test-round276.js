// Round 276 tests — the user, 2026-11-28: "also add green lens of shadow wrath (+36) and green lens of fiery wrath (+36) to
// the gear builder. i dont think it's gonna beat anything on the bis list but it's a good option for people to test".
// Green Lens (10504, Engineering, item level 49, Binds when equipped, 57 Armor, +10 Stamina, a random enchantment; Requires
// Engineering (245)) as two of its rolls, each with its own id (tools/gen-items.js EXTRA): 10504 × 10000 + the roll's
// random-enchantment id — 1861 "of Shadow Wrath" +36 Shadow, 1899 "of Fiery Wrath" +36 Fire (Wowhead Forever tooltip).
(function () {
  var SW = 105041861, FW = 105041899;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function find(q) { q = q.toLowerCase(); return Object.keys(WL.ITEMS).filter(function (id) { var it = WL.ITEMS[id]; return WL.gearFits('head', it) && it.name.toLowerCase().indexOf(q) >= 0; }).map(Number); }

  T.run('round 276: Green Lens of Shadow Wrath / of Fiery Wrath', function () {
    T.group('the items');
    var s = WL.ITEMS[SW], f = WL.ITEMS[FW];
    T.ok(s && s.name === 'Green Lens of Shadow Wrath', 'item ' + SW + ': Green Lens of Shadow Wrath');
    T.ok(f && f.name === 'Green Lens of Fiery Wrath', 'item ' + FW + ': Green Lens of Fiery Wrath');
    [s, f].forEach(function (it) {
      if (!it) return;
      T.ok(it.slot === 'head' && WL.gearFits('head', it), it.name + ': a head item');
      T.ok(it.quality === 'rare' && it.ilvl === 49 && it.from === 'Crafted' && it.src === 'crafted' && (it.phase || 1) === 1 && !it.raid, it.name + ': blue, item level 49, crafted, Phase 1');
      T.ok(it.icon === WL.ITEM_ICONS.names.indexOf('inv_helmet_44') && it.icon >= 0, it.name + ': the Green Lens icon (inv_helmet_44)');
    });
    T.eq(JSON.stringify(s && s.stats), JSON.stringify({ shadowSp: 36, sta: 10 }), 'Shadow Wrath: +36 Shadow damage, +10 Stamina, nothing else');
    T.eq(JSON.stringify(f && f.stats), JSON.stringify({ fireSp: 36, sta: 10 }), 'Fiery Wrath: +36 Fire damage, +10 Stamina, nothing else');
    T.ok(!WL.ITEMS[10504], 'no plain Green Lens (only +10 Stamina: not listed)');

    T.group('in the gear builder');
    var gs = WL.gearSheet({ on: true, slots: { head: { id: SW } }, enchants: {}, manual: {} }, WL.DEFAULT_CONFIG).items;
    var gf = WL.gearSheet({ on: true, slots: { head: { id: FW } }, enchants: {}, manual: {} }, WL.DEFAULT_CONFIG).items;
    T.ok(gs.shadowSp === 36 && gs.fireSp === 0 && gs.sp === 0 && gs.sta === 10, 'worn, Shadow Wrath counts +36 to Shadow only (and +10 Stamina)');
    T.ok(gf.fireSp === 36 && gf.shadowSp === 0 && gf.sp === 0 && gf.sta === 10, 'worn, Fiery Wrath counts +36 to Fire only (and +10 Stamina)');
    var hits = find('green lens');
    T.ok(hits.indexOf(SW) >= 0 && hits.indexOf(FW) >= 0 && hits.length === 2, 'a head-slot search for "green lens" finds both');
    T.ok(find('shadow wrath').indexOf(SW) >= 0 && find('fiery wrath').indexOf(FW) >= 0, '"shadow wrath" / "fiery wrath" find each');

    T.group('the tooltips');
    if (!WL.ITEM_TIPS) { T.warn('data/item-tips.js not loaded'); return; }
    var ts = WL.ITEM_TIPS[SW] || '', tf = WL.ITEM_TIPS[FW] || '';
    T.ok(/Green Lens of Shadow Wrath/.test(ts) && /\+36 Shadow Spell Damage/.test(ts) && /57 Armor/.test(ts) && /\+10 Stamina/.test(ts) && /Requires Engineering \(245\)/.test(ts), 'Shadow Wrath: its Wowhead Forever tooltip (57 Armor, +36 Shadow Spell Damage, +10 Stamina, Requires Engineering (245))');
    T.ok(/Green Lens of Fiery Wrath/.test(tf) && /\+36 Fire Spell Damage/.test(tf) && /57 Armor/.test(tf) && /\+10 Stamina/.test(tf) && /Requires Engineering \(245\)/.test(tf), 'Fiery Wrath: its tooltip (+36 Fire Spell Damage)');
    T.ok(!/Item Level|Sell Price|<a\b|<!--/.test(ts + tf), 'cleaned like the others (no item level line, sell price, links or comments)');

    T.group('the lists');
    var P = WL.PRE_RAID_BIS, M = WL.MAX_PRE_RAID_BIS;
    T.ok(Object.keys(P).every(function (k) { return [SW, FW].indexOf(P[k].head) < 0 && [SW, FW].indexOf(M[k].head) < 0; }), 'on no BiS list (user: "i dont think it\'s gonna beat anything on the bis list")');
    var g = src('../tools/gen-items.js');
    if (g) T.ok(/id: 105041861, n: 'Green Lens of Shadow Wrath'/.test(g) && /id: 105041899, n: 'Green Lens of Fiery Wrath'/.test(g), 'tools/gen-items.js: both in EXTRA');
  });
})();
