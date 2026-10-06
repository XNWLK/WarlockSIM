// Round 29 tests: best-build-per-tree option, and the talent checks on the Affliction build (04_EXPLORATION §17).
(function () {
  function tp(b, tree) { return Object.keys(b.talents).reduce(function (s, k) { return s + (WL.TALENT_BY_KEY[k].tree === tree ? b.talents[k] : 0); }, 0); }
  function swap(b, ch) {
    var x = JSON.parse(JSON.stringify(b));
    Object.keys(ch).forEach(function (k) { var n = (x.talents[k] || 0) + ch[k]; if (n) x.talents[k] = n; else delete x.talents[k]; });
    return x;
  }

  T.run('best build per tree, Affliction talent checks (round 29)', function () {
    T.group('best build per tree (tags "best Affliction / Demonology / Destruction")');
    var list = WL.DEFAULT_CONFIG.options.alwaysShowBestTrees || [];
    T.eq(list.map(function (o) { return o.tree + ':' + o.minPoints; }).join(','), 'affliction:25,demonology:25,destruction:25', 'one entry per tree, 25 points each');
    list.forEach(function (o) {
      var q = WL.BUILDS.filter(function (b) { return tp(b, o.tree) >= o.minPoints; });
      T.ok(q.length >= 1, WL.TREES[o.tree].name + ': the sheet has a qualifying build (' + q.map(function (b) { return b.key; }).join(', ') + ')');
    });

    T.group('Affliction build: filler talents without a DPS effect');
    var aff = WL.findBuild('aff_succ_sb'), cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    // Round 30: the sheet build now has Demonic Embrace 2 / Demonic Energies 1 / no Master Summoner (user). `old` is the
    // round-28 version (Master Summoner 1, Demonic Energies 2); `de0` drops Demonic Energies entirely.
    T.eq(JSON.stringify([aff.talents.demonicEmbrace, aff.talents.demonicEnergies, aff.talents.masterSummoner || 0]), '[2,1,0]', 'sheet build: Embrace 2, Demonic Energies 1, no Master Summoner (round 30)');
    var old = swap(aff, { masterSummoner: 1, demonicEnergies: 1, demonicEmbrace: -2 }), de0 = swap(aff, { demonicEnergies: -1, demonicEmbrace: 1 });
    T.eq(WL.validateBuild(old).concat(WL.validateBuild(de0)).join(' | '), '', 'both variants are legal (row gates kept)');
    var a = WL.simulate(aff, 'gnome', cfg, { iterations: 200, log: false }).dps;
    T.near(WL.simulate(old, 'gnome', cfg, { iterations: 200, log: false }).dps, a, 1e-9, 'round-28 version (Master Summoner, Demonic Energies 2): identical DPS (summon speed / Stamina only)');
    T.near(WL.simulate(de0, 'gnome', cfg, { iterations: 200, log: false }).dps, a, 1e-9, 'Demonic Energies 0 (+1 Embrace): identical DPS (the Succubus never runs out of mana in a 3-min fight)');
    var ss = swap(aff, { bane: -2, soulSiphon: 2 }), noBane = swap(aff, { bane: -2 });
    // Soul Siphon only boosts drains: compared with simply dropping Bane's two points (49 points; the engine does not
    // check the total), the two Soul Siphon points add nothing.
    T.near(WL.simulate(ss, 'gnome', cfg, { iterations: 200, log: false }).dps, WL.simulate(noBane, 'gnome', cfg, { iterations: 200, log: false }).dps, 1e-9,
      'Soul Siphon 3/3 adds nothing to a build without drains');
  });
})();
