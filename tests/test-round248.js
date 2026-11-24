// Round 248 tests — the user: "add a gear preset to realistic pre-bis and custom, called Max Pre-BiS. that gear set should
// have the best pieces equipped from the bis list with the best enchants etc. basically the maximum power available right
// now, regardless of reputation or money constraints." Every build gets a Max Pre-BiS list (data/pre-raid-bis.js
// WL.MAX_PRE_RAID_BIS + WL.MAX_PRE_RAID_BIS_ENCHANTS → tools/gen-pre-bis.js → data/pre-bis-gear.js WL.MAX_BIS_GEAR): the
// Realistic list with every ▲ upgrade, then searched slot by slot in real fights over the Phase 1 pool (not raid, Horde, not
// the items the user took out — the Demonheart pieces stay out for now), with the best Phase 1 enchants. cfg.gearMode
// 'maxBis' fights in it (engine/stats.js WL.cfgFor); the quick setup's third gear button; share codes keep it.
(function () {
  function bk(k) { return WL.BUILDS.filter(function (b) { return b.key === k; })[0]; }
  function gbOf(slots, ench) {
    var gb = { on: true, slots: {}, enchants: {}, manual: {} };
    Object.keys(slots).forEach(function (s) { gb.slots[s] = { id: slots[s] }; });
    Object.keys(ench || {}).forEach(function (s) { if (slots[s]) gb.enchants[s] = typeof ench[s] === 'number' ? { id: ench[s] } : ench[s]; });
    return gb;
  }
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.responseText; } catch (e) { return ''; } }

  T.run('round 248: Max Pre-BiS gear preset', function () {
    var M = WL.MAX_PRE_RAID_BIS, ME = WL.MAX_PRE_RAID_BIS_ENCHANTS, G = WL.MAX_BIS_GEAR, R = WL.PRE_RAID_BIS;
    T.group('the lists (data/pre-raid-bis.js)');
    T.ok(M && ME && G, 'WL.MAX_PRE_RAID_BIS, WL.MAX_PRE_RAID_BIS_ENCHANTS and WL.MAX_BIS_GEAR are loaded');
    if (!M || !ME || !G) return;
    T.eq(Object.keys(M).sort().join(','), Object.keys(R).sort().join(','), 'a Max list for each build with a Realistic list (' + Object.keys(M).length + ')');
    var OUT = { 273940: 1, 273941: 1, 273942: 1, 273943: 1, 272407: 1, 237820: 1, 227808: 1 };   // Demonheart (user: "leave them out for now"), and the items the user took out
    for (var w = 275968; w <= 275983; w++) OUT[w] = 1;                                         // The Watchers' rings (raid)
    Object.keys(M).forEach(function (k) {
      var L = M[k], E = ME[k] || {}, bad = [], two = WL.ITEMS[L.mainHand] && WL.ITEMS[L.mainHand].slot === 'twoHand';
      Object.keys(L).forEach(function (s) { var it = WL.ITEMS[L[s]]; if (!it || !WL.gearFits(s, it) || (it.phase || 1) > 1 || it.raid || it.side === 'Alliance' || OUT[L[s]]) bad.push(s + ' ' + L[s]); });
      T.ok(!bad.length, k + ': ' + Object.keys(L).length + ' items, each in the item list, fits its slot, Phase 1, not from a raid, not Alliance-only, not one the user took out', bad.join(', '));
      T.ok(L.finger1 !== L.finger2 && L.trinket1 !== L.trinket2 && !(L.finger1 === 12543 && L.finger2 === 12545) && !(L.finger1 === 12545 && L.finger2 === 12543), k + ': two different rings and trinkets (Songstone of Ironforge and Eye of Orgrimmar not together)');
      T.ok(!(two && L.offHand), k + ': no off hand with a two-hander');
      T.ok(!WL.gearUniqueOver(gbOf(L)).length, k + ': no unique-equipped category worn too often');
      var eb = [];
      Object.keys(E).forEach(function (s) {
        var e = E[s]; if (!L[s]) { eb.push(s + ': no item'); return; }
        if (typeof e === 'object') { if (!(e.custom && e.custom.name)) eb.push(s + ': custom enchant without a name'); return; }
        var en = WL.ENCHANTS[e]; if (!en || (en.slots || []).indexOf(s) < 0 || WL.enchantPhase(e) !== 1 || (en.twoHand && !two)) eb.push(s + ' ' + e);
      });
      T.ok(!eb.length, k + ': ' + Object.keys(E).length + ' enchants, each Phase 1, for its slot (a two-hand enchant only on a two-hander)', eb.join(', '));
      T.ok(WL.GEAR_SLOTS.every(function (g) { return !g.enchant || !L[g.key] || E[g.key] != null || ['shoulder', 'back', 'waist'].indexOf(g.key) >= 0; }), k + ': every enchantable slot with a Phase 1 enchant worth having is enchanted');
    });
    T.ok(WL.PRE_RAID_BIS.wrack_ds.mainHand === 18372 && WL.preRaidBisEnchants('wrack_ds').mainHand === 2568, 'the Realistic lists are untouched (Wrack DS: Blade of the New Moon, Intellect +22)');

    T.group('the generated gear (data/pre-bis-gear.js WL.MAX_BIS_GEAR)');
    T.eq(Object.keys(G).sort().join(','), Object.keys(M).concat(['_common']).sort().join(','), 'every Max list + _common');
    var c0 = WL.pageDefaultConfig();
    Object.keys(M).forEach(function (k) {
      T.eq(JSON.stringify(G[k].slots), JSON.stringify(M[k]), k + ': the items of the list');
      var sh = WL.gearSheet(gbOf(M[k], ME[k]), c0), ok = WL.GEAR_STAT_KEYS.every(function (st) { return Math.abs((G[k].sums[st] || 0) - Math.round((sh.items[st] + sh.sets[st] + sh.enchants[st]) * 100) / 100) < 1e-9; });
      T.ok(ok, k + ': the stat sums are the gear builder\'s (items, set bonuses, enchants): ' + JSON.stringify(G[k].sums));
      T.ok(G[k].sums.sp > WL.PRE_BIS_GEAR[k].sums.sp, k + ': more spell power than the Realistic list (' + G[k].sums.sp + ' vs ' + WL.PRE_BIS_GEAR[k].sums.sp + ')');
    });
    var cm = G._common, cmTwo = WL.ITEMS[cm.slots.mainHand] && WL.ITEMS[cm.slots.mainHand].slot === 'twoHand';
    T.ok(cm && !(cmTwo && cm.slots.offHand) && Object.keys(cm.enchants).every(function (s) { return cm.slots[s]; }), '_common: a whole list (no off hand with a two-hander, enchants only on worn slots)');

    T.group('the fights (engine/stats.js WL.cfgFor)');
    var c = WL.pageDefaultConfig();
    T.eq(c.gearMode, 'preBis', 'the page still starts on Realistic Pre-BiS');
    T.eq(WL.PAGE_GEAR_MODE, 'preBis', 'WL.PAGE_GEAR_MODE stays preBis');
    c.gearMode = 'maxBis';
    Object.keys(M).forEach(function (k) {
      var g = WL.cfgFor(bk(k), c), ids = {};
      Object.keys(g.gearBuilder.slots).forEach(function (s) { ids[s] = g.gearBuilder.slots[s].id; });
      T.ok(g.gearMode === 'maxBis:applied' && JSON.stringify(ids) === JSON.stringify(M[k]) && g.gear.sp === G[k].sums.sp, k + ': WL.cfgFor wears its Max list (' + g.gear.sp + ' SP)');
    });
    var own = { key: 'mine_x', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: [] };
    T.eq(WL.cfgFor(own, c).gearBuilder.slots.head.id, G._common.slots.head, 'a build without a list wears the Max _common list');
    var cp = WL.pageDefaultConfig();
    T.eq(WL.cfgFor(bk('wrack_ds'), cp).gearBuilder.slots.mainHand.id, 18372, 'Realistic Pre-BiS is unchanged (Wrack DS: Blade of the New Moon)');
    T.ok(WL.cfgFor(bk('wrack_ds'), cp).gearMode === 'preBis:applied', '… marked preBis:applied');
    var cc = WL.pageDefaultConfig(); cc.gearMode = null; T.ok(WL.cfgFor(bk('wrack_ds'), cc) === cc, 'Custom: the settings as they are');
    ['demo_pact_fire', 'wrack_ds'].forEach(function (k) {
      var a = WL.pageDefaultConfig(), b = WL.pageDefaultConfig(); b.gearMode = 'maxBis';
      a.fight.iterations = b.fight.iterations = 200; a.fight.seed = b.fight.seed = 4242;
      var ra = WL.simulate(bk(k), 'orc', a, { log: false }), rb = WL.simulate(bk(k), 'orc', b, { log: false });
      T.ok(rb.dps > ra.dps + 15, bk(k).short + ': Max Pre-BiS hits harder than Realistic (' + rb.dps.toFixed(1) + ' vs ' + ra.dps.toFixed(1) + ' DPS, 200 fights)');
    });

    T.group('share codes (engine/settings-code.js)');
    var m = WL.pageDefaultConfig(); m.gearMode = 'maxBis';
    var sm = WL.settingsSnapshot(m);
    T.ok(sm.gm === 'maxBis' && !sm.gear && !sm.gb, 'Max Pre-BiS: the code says so; the gear values and items are not in it');
    var back = WL.pageDefaultConfig(); back.gearMode = null; WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(m)));
    T.eq(back.gearMode, 'maxBis', 'a Max Pre-BiS code loads as Max Pre-BiS');
    var pre = WL.pageDefaultConfig(), x = WL.pageDefaultConfig(); x.gearMode = 'maxBis'; WL.applySettings(x, WL.decodeSettings(WL.encodeSettings(pre)));
    T.eq(x.gearMode, 'preBis', 'a Realistic Pre-BiS code still loads as Realistic Pre-BiS');
    var cu = WL.pageDefaultConfig(); cu.gearMode = null; cu.gear.sp = 321; var y = WL.pageDefaultConfig(); y.gearMode = 'maxBis'; WL.applySettings(y, WL.decodeSettings(WL.encodeSettings(cu)));
    T.ok(y.gearMode === null && y.gear.sp === 321, 'a Custom code still loads as your own gear');
    var old = WL.settingsSnapshot(cu); delete old.gm; var z = WL.pageDefaultConfig(); z.gearMode = 'maxBis'; WL.applySettings(z, old);
    T.ok(z.gearMode === null && z.gear.sp === 321, 'a code from before the gear modes (no gm) is your own gear');
    T.ok(/^Max Pre-BiS gear/.test(WL.describeSettings(sm)), 'the batch list names it: ' + WL.describeSettings(sm).split(' · ')[0]);
    if (WL.settingsDiff && WL.settingsMerge) {
      var d = WL.settingsDiff(sm), mg = WL.settingsMerge(d);
      T.ok(d.gm === 'maxBis' && mg.gm === 'maxBis' && !mg.gear && !mg.gb, 'a share link of Max Pre-BiS: gm in the differences, no gear section when merged back');
    }

    T.group('the page (index.html, app/app.js)');
    var html = src('../index.html'), app = src('../app/app.js');
    if (!html || !app) { T.warn('index.html / app/app.js not readable (file://)'); return; }
    var bar = (html.match(/aria-label="Gear preset">([\s\S]*?)<\/span>/) || [])[1] || '';
    var order = (bar.match(/data-qgear="(\w+)"/g) || []).map(function (s) { return s.replace(/.*="|"/g, ''); });
    T.eq(order.join(','), 'prebis,maxbis,custom', 'the quick setup\'s gear buttons: Realistic Pre-BiS, Max Pre-BiS, Custom');
    T.ok(/data-qgear="maxbis"[^>]*>Max Pre-BiS</.test(html), 'the button reads "Max Pre-BiS"');
    T.ok(/Max Pre-BiS — every build in its own list/.test(html), 'the Stats panel\'s help text explains Max Pre-BiS');
    T.ok(/'qgear:maxbis':/.test(app) && /which === 'maxbis' \? 'Max Pre-BiS gear/.test(app), 'its tooltip and quick-setup message');
    T.ok(/cfg\.gearMode = which === 'maxbis' \? 'maxBis' : 'preBis'/.test(app), 'the button sets gearMode maxBis');
    T.ok(/listName\(G\.mode\) \+ ' · '/.test(app), 'the Gear tab names the list ("Max Pre-BiS · <build>")');
    T.ok(/listMode\(runCfg\) \? chip\('--c-sp', listName\(runCfg\.gearMode\)/.test(app), 'the run chip names the gear mode');
    T.ok(/kind !== 'len' && listMode\(c\)/.test(app), 'stat charts: each build\'s own Max list too');
    T.ok(/' list\. ' \+ nm \+ ' in the quick setup brings the lists back\.'/.test(app), 'a change in the gear builder makes it your own gear, naming the list it came from');
  });
})();
