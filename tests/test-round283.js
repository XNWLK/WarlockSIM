// Round 283 tests (user: "yes add the precast"): the APL export for [another Forever sim] always writes a precast prepull row.
// Fight & pets → Precast set: that spell (as before). Off: the spell this build gains most from, measured here by simulation
// (engine/apl-io.js Exporter.bestPrecast). Timed as that sim's presets time it: −0.9 × (cast time + travel time). A demon
// out attacks at −1 s. On import, prepull rows stay unread; a single precast is a note with the matching setting.
(function () {
  function cfgOf(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.concat(WL.RETIRED_BUILDS || []).filter(function (b) { return b.key === k; })[0])); }
  function canon(x) { return JSON.stringify(WL.APL_IO.canon(x == null ? null : x)); }
  function prepull(text) { var i = text.indexOf('\nprepull:\n'), j = text.indexOf('\npriority:\n'); return i < 0 ? [] : text.slice(i, j).split('\n').filter(function (l) { return /^ {2}`/.test(l); }).map(function (l) { return JSON.parse(l.trim().slice(1, -1)); }); }
  function timing(id) { return { math: { op: 'OpMul', lhs: { math: { op: 'OpAdd', lhs: { spellCastTime: { spellId: id } }, rhs: { spellTravelTime: { spellId: id } } } }, rhs: { const: { val: '-0.9' } } } }; }
  var PC_IDS = WL.PRECAST_SPELLS.map(function (k) { return WL.SPELLS[k].id; });

  T.run('round 283: the export always precasts', function () {
    var keep = WL.APL_IO.precastFights; WL.APL_IO.precastFights = 10;
    try {
      var builds = WL.BUILDS.filter(function (b) { return !b.custom; }).concat(WL.RETIRED_BUILDS || []), bad = [], c = cfgOf(), before = JSON.stringify(c);
      builds.forEach(function (b) {
        var e = WL.aplExport(b, c), P = prepull(e.text), casts = P.filter(function (p) { return p.action.castSpell; }), pets = P.filter(function (p) { return p.action.petAttack; });
        if (casts.length !== 1 || PC_IDS.indexOf(casts[0].action.castSpell.spellId.spellId) < 0) { bad.push(b.key + ': ' + JSON.stringify(P)); return; }
        if (canon(casts[0].doAtValue) !== canon(timing(casts[0].action.castSpell.spellId))) bad.push(b.key + ': timing ' + JSON.stringify(casts[0].doAtValue));
        if (pets.length !== (b.pet ? 1 : 0) || (pets[0] && canon(pets[0].doAtValue) !== canon({ const: { val: '-1s' } }))) bad.push(b.key + ': demon attack ' + JSON.stringify(pets));
        if (!e.notes.some(function (n) { return /^Precast .+ is a prepull row: Fight & pets → Precast is off here, so the export picked the precast this build gains most from, by simulation \(.*no precast [\d.]+ DPS in 10 fights each\)\.$/.test(n); })) bad.push(b.key + ': note');
        if (b.pet && !e.notes.some(function (n) { return /the demon attacks at −1 s/.test(n); })) bad.push(b.key + ': demon note');
        if (canon(JSON.parse(e.json).player.rotation.prepullActions) !== canon(P)) bad.push(b.key + ': the JSON form differs');
      });
      T.eq(bad.slice(0, 4).join(' | '), '', builds.length + ' builds, Precast off: one precast of a spell this sim can precast, at −0.9 × (cast + travel time), the note with the measured DPS; the demon attacks at −1 s when one is out');
      T.eq(JSON.stringify(c), before, 'the settings are not changed by the export (Precast stays off here)');
      T.eq(WL.DEFAULT_CONFIG.fight.precast, '', 'this sim\'s own default: no precast');
      // the pick is the highest mean DPS of the spells it can precast, on the same fights
      var w = sheet('wrack_ds'), best = null, bestD = -Infinity;
      WL.PRECAST_SPELLS.forEach(function (k) {
        var cc = JSON.parse(JSON.stringify(c)); cc.fight.precast = k;
        var st = WL.computeStats(w, 'human', cc), tb = WL.buildSpellTable(w, st, cc); if (!WL.precastOf(w, cc, tb)) return;
        var d = 0; for (var i = 0; i < 10; i++) { var fp = WL.fightParams(cc, i); d += WL.simulateOnce(w, 'human', cc, { stats: st, table: tb, seed: fp.seed, duration: fp.duration, log: false }).dps; }
        if (d > bestD) { bestD = d; best = k; }
      });
      var pw = prepull(WL.aplExport(w, c).text)[0];
      T.ok(best && pw.action.castSpell.spellId.spellId === WL.SPELLS[best].id, 'Wrack DS: the pick (' + WL.SPELLS[best].name + ') is the best of its candidates in the same 10 fights');
      var t0 = Date.now(); WL.aplExport(w, c); T.ok(Date.now() - t0 < 1000, 'the same build and settings again: from the cache');
      var ci = cfgOf(function (x) { x.fight.precast = 'immolate'; }), ei = WL.aplExport(w, ci), pi = prepull(ei.text);
      T.ok(pi[0].action.castSpell.spellId.spellId === WL.SPELLS.immolate.id && ei.notes.indexOf('Precast Immolate (Fight & pets) is a prepull row.') >= 0, 'Precast set here (Immolate): that spell, as before');
    } finally { WL.APL_IO.precastFights = keep; }
  });

  T.run('round 283: imports read a precast as a hint', function () {
    var keep = WL.APL_IO.precastFights; WL.APL_IO.precastFights = 6;
    try {
      var fd = sheet('demo_pact_fire'), e = WL.aplExport(fd, cfgOf()), im = WL.aplImport(e.text), tb = WL.aplToBuild(im.lines, fd);
      var pid = prepull(e.text)[0].action.castSpell.spellId.spellId, nm = WL.SPELLS[Object.keys(WL.SPELLS).filter(function (k) { return WL.SPELLS[k].id === pid; })[0]].name;
      T.ok(!im.warnings.length && !tb.warnings.length && im.notes.indexOf('Prepull rows are left out: they precast ' + nm + ' and send the demon in before the pull — set Fight & pets → Precast to ' + nm + ' here to match.') >= 0,
        'our own export back: no warning, a note with the matching setting (' + nm + ')');
      T.eq(JSON.stringify(tb.build.rotation), JSON.stringify(fd.rotation), 'and the same priority');
      var tx = WL.aplImport('siml 1\nspec warlock\nprepull:\n  -2.7s cast shadow_bolt_rank9\npriority:\n  cast shadow_bolt_rank9\n');
      T.ok(!tx.warnings.length && tx.notes.some(function (n) { return /they precast Shadow Bolt — set Fight & pets → Precast to Shadow Bolt here to match/.test(n); }), 'their rotation text: "-2.7s cast shadow_bolt_rank9" → the same hint');
      var two = { type: 'TypeAPL', prepullActions: [{ action: { castSpell: { spellId: { spellId: 17924 } } }, doAtValue: { const: { val: '-2s' } } }, { action: { castSpell: { spellId: { spellId: 11668 } } }, doAtValue: { const: { val: '-0.1s' } } }], priorityList: [{ action: { castSpell: { spellId: { spellId: 11661 } } } }] };
      var i2 = WL.aplImport(JSON.stringify(two));
      T.ok(i2.warnings.some(function (x) { return /Prepull rows are left out \(a precast is set in Fight & pets → Precast here\)/.test(x); }) && !i2.notes.some(function (n) { return /they precast/i.test(n); }), 'two casts before the pull: warned (only one precast here)');
      var pot = { type: 'TypeAPL', prepullActions: [{ action: { castSpell: { spellId: { itemId: 13512 } } }, doAtValue: { const: { val: '-3s' } } }, { action: { castSpell: { spellId: { spellId: 11661 } } }, doAtValue: { const: { val: '-2s' } } }], priorityList: [{ action: { castSpell: { spellId: { spellId: 11661 } } } }] };
      var i3 = WL.aplImport(JSON.stringify(pot));
      T.ok(i3.warnings.some(function (x) { return /Prepull rows are left out/.test(x); }) && i3.notes.some(function (n) { return /^They precast Shadow Bolt — set Fight & pets → Precast to Shadow Bolt here to match\.$/.test(n); }), 'a potion and a precast: warned, with the hint for the precast');
    } finally { WL.APL_IO.precastFights = keep; }
  });
})();
