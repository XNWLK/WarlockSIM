// Step 2 tests: cross-check hand-written data files against the archived raw Wowhead data (RAW).
// RAW is captured by the WH stub in tests/index.html before the raw file loads.
(function () {
  var raw = window.RAW.talentCalc, gath = window.RAW.spells;
  var treeIdToKey = { 301: 'destruction', 302: 'affliction', 303: 'demonology' };
  // research/raw/ is kept locally and not in the public repository (third-party data): without it, the three
  // cross-checks against the raw data are skipped with a warning instead of failing (round 49).
  function rawRun(name, fn) {
    if (raw && gath) return T.run(name, fn);
    T.run(name, function () { T.group(name + ' vs raw'); T.warn('raw Wowhead data not found: cross-check skipped', 'research/raw/wowhead_forever_talents-classic_dv27.js is kept locally, not in the repository'); });
  }

  function numbersIn(text) {
    return (String(text).replace(/<[^>]+>/g, ' ').match(/\d+(\.\d+)?/g) || []).map(Number);
  }

  rawRun('talents', function () {
    T.group('talents vs raw');
    var rawByWid = {}, rawAll = [];
    Object.keys(treeIdToKey).forEach(function (tid) {
      Object.values(raw.talents[tid]).forEach(function (rt) { rawByWid[rt.id] = { rt: rt, tree: treeIdToKey[tid] }; rawAll.push(rt); });
    });
    T.eq(WL.TALENTS.length, rawAll.length, 'talent count matches raw (' + rawAll.length + ')');
    rawAll.forEach(function (rt) {
      T.ok(WL.TALENTS.some(function (t) { return t.wid === rt.id; }), 'raw talent present in data: ' + rt.name, 'missing ' + rt.name);
    });
    var widToKey = {};
    WL.TALENTS.forEach(function (t) { widToKey[t.wid] = t.key; });
    WL.TALENTS.forEach(function (t) {
      var r = rawByWid[t.wid];
      if (!r) { T.ok(false, t.key + ' exists in raw', 'wid ' + t.wid + ' not found'); return; }
      var rt = r.rt;
      T.eq(t.name, rt.name, t.key + ' name');
      T.eq(t.tree, r.tree, t.key + ' tree');
      T.eq(t.row, rt.row, t.key + ' row');
      T.eq(t.col, rt.col, t.key + ' col');
      T.eq(t.ranks, rt.ranks.length, t.key + ' ranks');
      T.eq(rt.requiredPoints, t.row * 5, t.key + ' requiredPoints == 5*row (engine rule)');
      var rawReq = rt.requires.length ? widToKey[rt.requires[0].id] + ':' + rt.requires[0].qty : 'none';
      var myReq = t.req ? t.req + ':' + t.reqQty : 'none';
      T.eq(myReq, rawReq, t.key + ' prerequisite');
      Object.keys(t.v).forEach(function (field) {
        var arr = t.v[field];
        T.eq(arr.length, t.ranks, t.key + '.' + field + ' has one value per rank');
        arr.forEach(function (val, i) {
          var desc = rt.descriptions[String(i + 1)];
          T.ok(numbersIn(desc).indexOf(val) >= 0, t.key + '.' + field + ' R' + (i + 1) + ' = ' + val + ' appears in tooltip',
            'tooltip R' + (i + 1) + ': ' + desc);
        });
      });
    });
  });

  rawRun('spells', function () {
    T.group('spells vs raw tooltips');
    // Expected "(X% of Spell Power)" strings: coefficient total as shown in the tooltip.
    // Round 42: the trainer ranks (Shadow Bolt R9, Immolate R7, Corruption R6) are not in the archive; their book ranks
    // are, with the same coefficients and durations — so this checks the book-rank spell set. The trainer-rank numbers
    // are pinned against SPELLVALUES.md in test-round42.js.
    var BOOK = WL.spellsFor({ options: { bookRanks: true } });
    Object.keys(BOOK).forEach(function (key) {
      var s = BOOK[key], g = gath[s.id];
      if (!g) { T.warn(key + ' (' + s.id + ') not in raw ability list', 'talent-rank spell; verified via research/wowhead_spell_details.md'); return; }
      T.eq(g.name_enus, s.name, key + ' name matches raw id ' + s.id);
      var d = g.description_enus, expect = [];
      if (s.kind === 'direct' || s.kind === 'hybrid') expect.push(+(s.coef * 100).toFixed(1));
      if (s.tickCoef != null && key !== 'siphonLife' && key !== 'drainLife') {
        var ticks = s.duration / s.tickEvery;
        expect.push(key === 'wrack' ? +(s.tickCoef * 100).toFixed(1) : +(s.tickCoef * ticks * 100).toFixed(1));
      }
      expect.forEach(function (pct) {
        T.ok(d.indexOf('(' + pct + '% of Spell Power)') >= 0, key + ' tooltip shows ' + pct + '% of Spell Power', d);
      });
      if (s.duration && d.match(/over (\d+) sec|Lasts (\d+) sec/)) {
        var m = d.match(/over (\d+) sec|Lasts (\d+) sec/), dur = +(m[1] || m[2]);
        if (key !== 'curseOfElements') T.eq(s.duration, dur, key + ' duration matches tooltip');
      }
    });
    T.ok(gath[11689].description_enus.indexOf('430 + Spirit') >= 0, 'Life Tap R6 formula (430 + Spirit)', gath[11689].description_enus);
  });

  rawRun('races', function () {
    T.group('races vs raw');
    var raceIds = { human: 1, orc: 2, undead: 5, gnome: 7, troll: 8 };
    WL.RACE_KEYS.forEach(function (rk) {
      var ids = raw.racials['9'][raceIds[rk]];
      WL.RACES[rk].racials.forEach(function (rc) {
        T.ok(ids.indexOf(rc.id) >= 0, rk + ': ' + rc.name + ' (' + rc.id + ') is a Warlock racial', 'ids=' + ids);
        T.eq(raw.racialNames[rc.id], rc.name, rk + ': racial name');
      });
    });
    var pct = function (id) { return numbersIn(gath[id] ? gath[id].description_enus : ''); };
    T.ok(pct(1260201).indexOf(10) >= 0, 'Touch of the Grave 10% (Warlock version)', gath[1260201] && gath[1260201].description_enus);
    // Eureka! changed after the archive (2026-09-23: 50%) — beta build 2026-09-24 made it 10% (S12). The archive keeps
    // the old text; the engine, the tooltip override and the live Wowhead page say 10%.
    T.ok(pct(1259821).indexOf(50) >= 0, 'archive still has the old Eureka! text (50% mana)', gath[1259821] && gath[1259821].description_enus);
    var eu = WL.RACES.gnome.racials.filter(function (r) { return r.id === 1259821; })[0];
    T.ok(eu.costRedPct === 10 && eu.dmgPct === 10, 'Eureka! in the engine: -10% mana, +10% damage (beta build 2026-09-24)', JSON.stringify(eu));
    T.ok(/reduced by 10% and deal 10% more damage/.test(WL.SPELL_TEXT[1259821]), 'Eureka! tooltip text updated (override in gen-tooltips.ps1)', WL.SPELL_TEXT[1259821]);
  });

  T.run('builds', function () {
    T.group('builds valid');
    var keys = {};
    WL.BUILDS.concat(WL.TEST_BUILDS).forEach(function (b) {
      var kk = b.key + (WL.TEST_BUILDS.indexOf(b) >= 0 ? '#fixture' : ''); T.ok(!keys[kk], b.key + ' unique key', 'duplicate'); keys[kk] = 1;
      var total = 0, perTree = { affliction: 0, demonology: 0, destruction: 0 };
      Object.keys(b.talents).forEach(function (k) {
        var t = WL.TALENT_BY_KEY[k], pts = b.talents[k];
        if (!t) { T.ok(false, b.key + ': talent ' + k + ' exists', 'unknown talent'); return; }
        T.ok(pts >= 1 && pts <= t.ranks, b.key + ': ' + k + ' points 1..' + t.ranks, 'got ' + pts);
        total += pts; perTree[t.tree] += pts;
        if (t.req) T.ok((b.talents[t.req] || 0) >= t.reqQty, b.key + ': ' + k + ' prerequisite ' + t.req, 'missing prerequisite');
        var below = 0;
        Object.keys(b.talents).forEach(function (k2) {
          var t2 = WL.TALENT_BY_KEY[k2];
          if (t2 && t2.tree === t.tree && t2.row < t.row) below += b.talents[k2];
        });
        T.ok(below >= t.row * 5, b.key + ': ' + k + ' row ' + t.row + ' needs ' + (t.row * 5) + ' pts below', 'only ' + below);
      });
      T.eq(total, 51, b.key + ': spends 51 points (' + perTree.affliction + '/' + perTree.demonology + '/' + perTree.destruction + ')');
      b.rotation.forEach(function (a) {
        var s = WL.SPELLS[a];
        if (s && s.talent) T.ok(b.talents[s.talent], b.key + ': rotation spell ' + a + ' is talented', 'needs ' + s.talent);
      });
      T.ok(WL.OILS[b.oil], b.key + ': oil exists', b.oil);
      if (b.sacrifice) T.ok(b.talents.demonicSacrifice, b.key + ': sacrifice needs Demonic Sacrifice', '');
      if (b.sacrifice && b.pet) T.ok(b.talents.demonicPact && b.pet !== b.sacrifice, b.key + ': pet + sacrifice needs Demonic Pact and a different demon', '');
      if (b.pet) T.ok(WL.DEFAULT_CONFIG.pets[b.pet], b.key + ': pet defined', b.pet);
    });
  });
})();
