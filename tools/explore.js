// Exploration tool (round 3, point-shift search + hill-climb since round 10): sanity checks, build search, rotation
// search. Results are copied into docs/04_EXPLORATION.md.
// Nothing here changes the simulator; it only calls the engine with different builds/rotations.
window.EX = (function () {
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var merge = function () { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = (o[k] || 0) + arguments[i][k]; return o; };

  // Same legality rules as tests/test-data.js.
  function validate(b) {
    var errs = [], total = 0;
    Object.keys(b.talents).forEach(function (k) {
      var t = WL.TALENT_BY_KEY[k], pts = b.talents[k];
      if (!t) { errs.push('unknown ' + k); return; }
      total += pts;
      if (pts < 1 || pts > t.ranks) errs.push(k + ' ranks');
      if (t.req && (b.talents[t.req] || 0) < t.reqQty) errs.push(k + ' needs ' + t.req);
      var below = 0;
      Object.keys(b.talents).forEach(function (k2) { var t2 = WL.TALENT_BY_KEY[k2]; if (t2 && t2.tree === t.tree && t2.row < t.row) below += b.talents[k2]; });
      if (below < t.row * 5) errs.push(k + ' row gate ' + below + '/' + t.row * 5);
    });
    if (total !== 51) errs.push('points ' + total);
    if (b.sacrifice && !b.talents.demonicSacrifice) errs.push('sacrifice without DS');
    if (b.sacrifice && b.pet && !(b.talents.demonicPact && b.pet !== b.sacrifice)) errs.push('pet+sacrifice needs Pact');
    return errs;
  }
  function split(t) {
    var s = { affliction: 0, demonology: 0, destruction: 0 };
    Object.keys(t).forEach(function (k) { s[WL.TALENT_BY_KEY[k].tree] += t[k]; });
    return s.affliction + '/' + s.demonology + '/' + s.destruction;
  }

  // ---------- talent packages ----------
  var A = {
    s2: { suppression: 2 }, s5: { suppression: 5 },
    s2ic5: { suppression: 2, improvedCorruption: 5 }, s5ic2: { suppression: 5, improvedCorruption: 2 },
    s5m2: { suppression: 5, malediction: 2 }, s5ic5: { suppression: 5, improvedCorruption: 5 },
    a18: { suppression: 5, improvedCorruption: 5, malediction: 5, improvedBaneOfAgony: 2, pandemic: 1 },
    a20: { suppression: 5, improvedCorruption: 5, malediction: 5, improvedBaneOfAgony: 2, pandemic: 3 },
    a31: { suppression: 5, improvedCorruption: 5, malediction: 5, improvedDrains: 3, improvedBaneOfAgony: 2, pandemic: 3,
           nightfall: 2, amplifyCurse: 1, siphonLife: 1, soulSiphon: 3, wrack: 1 },
  };
  A.a36 = merge(A.a31, { shadowMastery: 5 });
  A.a38 = merge(A.a36, { improvedLifeTap: 2 });
  A.a40 = { suppression: 5, improvedCorruption: 5, malediction: 5, improvedDrains: 3, improvedBaneOfAgony: 2, pandemic: 3,
            malevolence: 5, nightfall: 2, siphonLife: 1, soulSiphon: 3, shadowMastery: 5, wrack: 1 };
  var D = {
    d11s: { demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicSacrifice: 1 },
    d11p: { unholyPower: 5, felVitality: 3, demonicEnergies: 2, improvedSayaad: 1 },
    d13s: { demonicEmbrace: 5, felVitality: 3, demonicEnergies: 2, demonicAegis: 2, demonicSacrifice: 1 },
    d16dec: { demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicSacrifice: 1, masterSummoner: 2, improvedSayaad: 2, decimation: 1 },
    d21dec: { demonicEmbrace: 5, felVitality: 3, demonicAegis: 2, demonicEnergies: 2, demonicSacrifice: 1, masterSummoner: 2, improvedSayaad: 3, decimation: 2, demonicBrand: 1 },
    d31: { unholyPower: 5, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, improvedSayaad: 3, masterSummoner: 2,
           decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1 },
  };
  // Pact tree with Improved Imp (Firebolt +30%) instead of Improved Sayaad.
  D.d31imp = { unholyPower: 5, improvedImp: 3, felVitality: 3, demonicEnergies: 2, demonicSacrifice: 1, masterSummoner: 2,
               decimation: 2, demonicBrand: 3, soulLink: 1, demonicKnowledge: 3, masterDemonologist: 5, demonicPact: 1 };
  D.d30imp = merge(D.d31imp); delete D.d30imp.demonicPact;
  var X = {
    b4: { bane: 4 }, b5: { bane: 5 }, f9: { bane: 5, aftermath: 4 },
    x10: { improvedShadowBolt: 5, bane: 5 },
    x13: { improvedShadowBolt: 5, bane: 5, cataclysm: 3 },
    x15sb: { improvedShadowBolt: 5, bane: 5, ruin: 5 },
    x15b: { bane: 5, cataclysm: 3, aftermath: 2, ruin: 5 },
    x18: { improvedShadowBolt: 5, bane: 5, cataclysm: 3, ruin: 5 },
    x20: { improvedShadowBolt: 5, bane: 5, cataclysm: 3, aftermath: 2, ruin: 5 },
    x20f: { improvedShadowBolt: 5, bane: 5, aftermath: 5, ruin: 5 },
    x30sb: { improvedShadowBolt: 5, bane: 5, cataclysm: 3, aftermath: 2, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1, shadowAndFlame: 5 },
    x33i: { bane: 5, cataclysm: 3, aftermath: 5, ruin: 5, shadowburn: 1, agonizingFlames: 3, conflagrate: 1, baneOfHavoc: 1, fireAndBrimstone: 3, shadowAndFlame: 5, incinerate: 1 },
  };
  var R = {
    aff: ['curseOfElements', 'shadowTrance', 'bane', 'corruption', 'siphonLife', 'immolate', 'wrack'],
    inc: ['curseOfElements', 'bane', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'incinerate'],
    sb: ['curseOfElements', 'shadowTrance', 'bane', 'corruption', 'immolate', 'conflagrate', 'shadowburn', 'soulFire', 'shadowBolt'],
    demo: ['curseOfElements', 'bane', 'corruption', 'immolate', 'soulFire', 'shadowBolt'],
    fire: ['curseOfElements', 'bane', 'corruption', 'immolate', 'soulFire', 'searingPain'],
  };
  function mk(tag, parts, pet, sac, oil, rot) {
    var t = merge.apply(null, parts);
    return { key: tag, short: tag, name: split(t) + ' ' + tag, notes: 'exploration candidate', talents: t, pet: pet, sacrifice: sac, oil: oil, rotation: rot };
  }
  function candidates() {
    return [
      mk('Aff Wrack DS (current)', [A.a40, D.d11s], null, 'imp', 'spellstone', R.aff),
      mk('Aff Wrack Succ (current)', [A.a40, D.d11p], 'succubus', null, 'spellstone', R.aff),
      mk('Aff Wrack DS, SM, Bane', [A.a36, D.d11s, X.b4], null, 'imp', 'spellstone', R.aff),
      mk('Aff Wrack DS, ILT', [A.a38, D.d13s], null, 'imp', 'spellstone', R.aff),
      mk('Aff Wrack DS, Immolate talents', [A.a31, D.d11s, X.f9], null, 'imp', 'spellstone', R.aff),
      mk('Aff Wrack + Destro 20, Succ', [A.a31, X.x20], 'succubus', null, 'spellstone', R.aff),
      mk('Aff 20 + Pact SB', [A.a20, D.d31], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Destro Inc DS (current)', [A.s5ic2, D.d11s, X.x33i], null, 'succubus', 'firestone', R.inc),
      mk('Destro Inc DS, Malediction', [A.s5m2, D.d11s, X.x33i], null, 'succubus', 'firestone', R.inc),
      mk('Destro Inc DS, Energies', [A.s5, D.d13s, X.x33i], null, 'succubus', 'firestone', R.inc),
      mk('Destro Inc DS, 2 Supp', [A.s2ic5, D.d11s, X.x33i], null, 'succubus', 'firestone', R.inc),
      mk('Destro Inc Imp (current)', [A.a18, X.x33i], 'imp', null, 'firestone', R.inc),
      mk('Destro Inc Succubus', [A.a18, X.x33i], 'succubus', null, 'firestone', R.inc),
      mk('Destro SB DS (current)', [A.s5ic5, D.d11s, X.x30sb], null, 'imp', 'spellstone', R.sb),
      mk('Destro SB DS Decimation', [A.s5, D.d16dec, X.x30sb], null, 'imp', 'spellstone', R.sb),
      mk('Destro SB DS Decimation 0 Supp', [D.d21dec, X.x30sb], null, 'imp', 'spellstone', R.sb),
      mk('Demo Pact SB (current)', [D.d31, X.x20], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact SB 5 Supp', [A.s5, D.d31, X.x15sb], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact SB 5 Supp, Cata/Aft', [A.s5, D.d31, X.x15b], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact SB 2 Supp', [A.s2, D.d31, X.x18], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact SB 10 Aff', [A.s5ic5, D.d31, X.x10], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact SB 7 Aff', [A.s5ic2, D.d31, X.x13], 'succubus', 'imp', 'spellstone', R.demo),
      mk('Demo Pact Fire (Succ sac, Imp)', [A.s5, D.d31, X.x15b], 'imp', 'succubus', 'firestone', R.fire),
      // Round-3 follow-ups after the Imp turned out strong when fed by Demonic Energies:
      mk('Demo Pact Fire AgF', [D.d31, { bane: 5, aftermath: 5, ruin: 5, agonizingFlames: 3, cataclysm: 2 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Fire 5 Supp Aft', [A.s5, D.d31, { bane: 5, aftermath: 5, ruin: 5 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Fire 2 Supp', [A.s2, D.d31, { bane: 5, aftermath: 5, ruin: 5, cataclysm: 3 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Fire ImpImp 5 Supp', [A.s5, D.d31imp, { bane: 5, aftermath: 5, ruin: 5 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Fire ImpImp AgF', [D.d31imp, { bane: 5, aftermath: 5, ruin: 5, agonizingFlames: 3, cataclysm: 2 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Fire ImpImp AgF, Incinerate-less Immo', [A.s2, D.d31imp, { bane: 5, aftermath: 5, ruin: 5, cataclysm: 3 }], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Pact Imp, SB (Succ sac)', [A.s5, D.d31imp, X.x15sb], 'imp', 'succubus', 'spellstone', R.demo),
      mk('Destro Inc Imp + Energies', [{ suppression: 5, improvedCorruption: 3 }, { unholyPower: 5, improvedImp: 3, demonicEnergies: 2 }, X.x33i], 'imp', null, 'firestone', R.inc),
      mk('Aff Wrack Imp + Energies', [A.a40, { unholyPower: 5, improvedImp: 3, demonicEnergies: 2, felVitality: 1 }], 'imp', null, 'spellstone', R.aff),
      mk('Aff 20 + Pact Imp Fire', [A.a20, D.d31imp], 'imp', 'succubus', 'firestone', R.fire),
      mk('Demo Imp SB, no Pact', [A.s5, D.d30imp, { improvedShadowBolt: 5, bane: 5, ruin: 5, cataclysm: 1 }], 'imp', null, 'spellstone', R.demo),
      mk('Demo Pact Imp SB 2 Supp', [A.s2, D.d31imp, X.x18], 'imp', 'succubus', 'spellstone', R.demo),
      mk('Demo Pact Imp SB 0 Supp', [D.d31imp, X.x20], 'imp', 'succubus', 'spellstone', R.demo),
      mk('Destro Inc Imp + Energies, FV', [A.s5, { unholyPower: 5, improvedImp: 3, demonicEnergies: 2, felVitality: 3 }, X.x33i], 'imp', null, 'firestone', R.inc),
    ];
  }

  // ---------- helpers ----------
  function cfgWith(n) { var c = clone(WL.DEFAULT_CONFIG); c.fight.iterations = n; return c; }
  function sim(b, race, cfg, n) { return WL.simulate(b, race, cfg, { iterations: n, log: false }); }
  function share(r, pred) {
    var tot = 0, part = 0;
    Object.keys(r.bySpell).forEach(function (k) { tot += r.bySpell[k].dmg; if (pred(k)) part += r.bySpell[k].dmg; });
    return part / tot;
  }

  // ---------- 1. sanity checks ----------
  function sanity(n) {
    n = n || 2000;
    var out = [], c = cfgWith(n);
    // (a) Junk build: 51 points that cannot affect a Shadow-Bolt-only rotation (except Improved Life Tap for mana),
    //     no pet, no sacrifice, no oil, no curse → compare with a closed-form estimate.
    var junk = { key: 'junk', short: 'junk', name: 'junk', notes: '', pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'],
      talents: { improvedLifeTap: 2, improvedCorruption: 5, malediction: 5, soulHarvesting: 2, improvedDrains: 3, improvedBaneOfAgony: 2,
        felConcentration: 3, amplifyCurse: 1, pandemic: 3, malevolence: 5, nightfall: 2, curseOfExhaustion: 1,
        improvedHealthFunnel: 2, improvedImp: 3, demonicEmbrace: 5, improvedVoidwalker: 3, demonicAegis: 2, masterSummoner: 2 } };
    var cj = clone(c); cj.options.useCurseOfElements = false;
    var errs = validate(junk);
    var rj = sim(junk, 'troll', cj, n), st = rj.stats;   // troll: Berserking changes haste → also try human (no active racial)
    var rh = sim(junk, 'human', cj, n), sh = rh.stats;
    var hit = sh.hitPct / 100, crit = sh.critPct / 100, sbDmg = 269 + 0.857 * sh.sp;
    var perCast = sbDmg * hit * (1 + crit * 0.5);
    var tap = (430 + sh.spi) * 1.2, dur = c.fight.duration;
    // n casts of 3 s plus taps of 1.5 s fill the fight; taps needed = (380 n − maxMana) / tap
    var nCasts = (dur + 1.5 * sh.maxMana / tap) / (3 + 1.5 * 380 / tap);
    var expDps = perCast * nCasts / dur;
    out.push({ check: 'Junk build (' + split(junk.talents) + ', legal: ' + (errs.length ? errs.join(';') : 'yes') + '), Human, SB only',
      sim: rh.dps, expected: expDps, note: 'closed form: ' + nCasts.toFixed(1) + ' casts × ' + perCast.toFixed(1) + ' avg / ' + dur + ' s' });
    // (b) Ablations: remove one talent from a real build, compare the DPS change with a first-order estimate.
    var B = {}; WL.TEST_BUILDS.forEach(function (b) { B[b.key] = b; });
    function ablate(bk, race, talent, estimateFn, label) {
      var b = B[bk], b2 = clone(b); delete b2.talents[talent];
      var r1 = sim(b, race, c, n), r2 = sim(b2, race, c, n);
      out.push({ check: label, sim: r1.dps - r2.dps, expected: estimateFn(r1, r2), note: bk + ' / ' + race });
    }
    ablate('aff_wrack_ds', 'human', 'shadowMastery', function (r) {
      return r.dps * share(r, function (k) { return WL.SPELLS[k] && WL.SPELLS[k].school === 'shadow'; }) * (1 - 1 / 1.05);
    }, 'Shadow Mastery 5/5 ≈ shadow share × 5/105');
    ablate('demo_pact_succ', 'human', 'ruin', function (r) {
      var gain = 0;   // per Destruction spell: dmg × (critRate × 0.5) / (1 + critRate × 1.0)
      Object.keys(r.bySpell).forEach(function (k) {
        var s = WL.SPELLS[k]; if (!s || s.tree !== 'destruction') return;
        var x = r.bySpell[k], ev = x.hits + x.ticks, cr = ev ? (x.crits + x.tickCrits) / ev : 0;
        gain += x.dmg * (cr * 0.5) / (1 + cr * 1.0);
      });
      return gain / (r.avgDuration || r.firstFight.duration);
    }, 'Ruin 5/5 ≈ Σ destruction dmg × crit × 0.5 / (1 + crit)');
    ablate('destro_incin_ds', 'human', 'agonizingFlames', function (r) {
      return r.dps * share(r, function (k) { return WL.SPELLS[k] && WL.SPELLS[k].tree === 'destruction'; }) * (1 - 1 / 1.10);
    }, 'Agonizing Flames 3/3 ≈ destruction share × 10/110');
    ablate('demo_pact_succ', 'human', 'soulLink', function (r) {
      return r.dps * (1 - 1 / 1.03);
    }, 'Soul Link ≈ 3/103 of all damage');
    // (c) Suppression vs stat weight: 5% hit from the talent should match 50 hit rating × hit weight.
    var b = B.destro_incin_ds, b2 = clone(b); delete b2.talents.suppression;
    var w = WL.statWeights(b2, 'human', c, n);
    var r1 = sim(b, 'human', c, n), r2 = sim(b2, 'human', c, n);
    out.push({ check: 'Suppression 5/5 vs 5 × (DPS per 1% hit)', sim: r1.dps - r2.dps, expected: 5 * w.hitPct, note: 'destro_incin_ds / human' });
    return out.map(function (o) { o.diffPct = 100 * (o.sim / o.expected - 1); return o; });
  }

  // ---------- 2. build search ----------
  function search(race, n) {
    var c = cfgWith(n);
    return candidates().map(function (b) {
      var errs = validate(b);
      if (errs.length) return { name: b.name, invalid: errs.join('; ') };
      var r = sim(b, race, c, n);
      return { name: b.name, split: split(b.talents), dps: r.dps, err: r.dpsErr, build: b };
    }).sort(function (a, b) { return (b.dps || 0) - (a.dps || 0); });
  }

  // ---------- 3. rotation variants ----------
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var out = [];
    arr.forEach(function (x, i) { permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); });
    return out;
  }
  // Try every order of the non-filler actions (filler stays last). Screen with nScreen fights, confirm the top 5 with nConfirm.
  function rotationSearch(b, race, nScreen, nConfirm) {
    var filler = b.rotation[b.rotation.length - 1], head = b.rotation.slice(0, -1);
    var c = cfgWith(nScreen), base = sim(b, race, c, nScreen).dps;
    var tried = permutations(head).map(function (p) {
      var b2 = clone(b); b2.rotation = p.concat([filler]);
      return { rot: b2.rotation, dps: sim(b2, race, c, nScreen).dps };
    }).sort(function (x, y) { return y.dps - x.dps; });
    var cc = cfgWith(nConfirm), baseC = sim(b, race, cc, nConfirm).dps;
    var top = tried.slice(0, 5).map(function (t) { var b2 = clone(b); b2.rotation = t.rot; return { rot: t.rot, dps: sim(b2, race, cc, nConfirm).dps }; });
    return { build: b.key, count: tried.length, baseScreen: base, baseConfirm: baseC, top: top, worst: tried[tried.length - 1] };
  }
  // Remove / add single actions.
  function actionVariants(b, race, n, extraActions) {
    var c = cfgWith(n), base = sim(b, race, c, n).dps, out = [];
    b.rotation.slice(0, -1).forEach(function (a, i) {
      var b2 = clone(b); b2.rotation.splice(i, 1);
      out.push({ change: 'without ' + a, dps: sim(b2, race, c, n).dps });
    });
    (extraActions || []).forEach(function (x) {
      var b2 = clone(b); b2.rotation.splice(x.at, 0, x.action);
      out.push({ change: 'add ' + x.action + ' at ' + x.at, dps: sim(b2, race, c, n).dps });
    });
    return { build: b.key, base: base, variants: out.map(function (o) { o.deltaPct = 100 * (o.dps / base - 1); return o; }) };
  }

  // ---------- 4. point-shift search (round 10) ----------
  // Every legal build reachable by moving 1–3 points from one taken talent to another talent (same or other tree).
  // Screened at nScreen fights; the top `keep` are confirmed at nConfirm fights with the same seed (common random numbers).
  // Optional `keep(candidate)` filter (round 28): e.g. only builds with >= 25 Affliction points, see minTree().
  function neighbours(b, keep) {
    var out = [], seen = {};
    Object.keys(b.talents).forEach(function (from) {
      for (var k = 1; k <= Math.min(3, b.talents[from]); k++) {
        WL.TALENTS.forEach(function (to) {
          if (to.key === from) return;
          var t = JSON.parse(JSON.stringify(b.talents));
          t[from] -= k; if (!t[from]) delete t[from];
          t[to.key] = (t[to.key] || 0) + k;
          var cand = clone(b); cand.talents = t;
          // spells that need a removed talent drop out of the rotation automatically (S.has); pet/sacrifice rules still apply
          if (validate(cand).length || (keep && !keep(cand))) return;
          var sig = JSON.stringify(Object.keys(t).sort().map(function (x) { return x + t[x]; }));
          if (seen[sig]) return; seen[sig] = 1;
          cand.shift = '-' + k + ' ' + from + ' +' + k + ' ' + to.key;
          out.push(cand);
        });
      }
    });
    return out;
  }
  function pointShift(b, race, nScreen, nConfirm, keep) {
    var c = cfgWith(nScreen), base = sim(b, race, c, nScreen).dps;
    var cands = neighbours(b).map(function (x) { return { b: x, dps: sim(x, race, c, nScreen).dps }; })
      .sort(function (x, y) { return y.dps - x.dps; });
    var cc = cfgWith(nConfirm), baseC = sim(b, race, cc, nConfirm).dps;
    var top = cands.slice(0, keep || 5).map(function (x) {
      var d = sim(x.b, race, cc, nConfirm).dps;
      return { shift: x.b.shift, split: split(x.b.talents), dps: d, deltaPct: 100 * (d / baseC - 1) };
    }).sort(function (x, y) { return y.dps - x.dps; });
    return { build: b.key, tried: cands.length, base: baseC, top: top };
  }

  // ---------- 5. hill-climb (round 10), asynchronous so the page stays responsive ----------
  // Repeatedly apply the best 1–3 point move (screen all legal neighbours at nScreen fights, confirm the top 4 at
  // nConfirm) until no move gains more than thresholdPct or maxRounds is reached. Progress/results in EX.jobs[key].
  var jobs = {};
  function climb(build, race, nScreen, nConfirm, thresholdPct, maxRounds, keep) {
    var cfg = clone(WL.DEFAULT_CONFIG), key = build.key + '|' + race;
    var job = jobs[key] = { key: key, status: 'running', round: 0, steps: [], progress: '' };
    var cur = clone(build);
    function round() {
      job.round++;
      var cands = neighbours(cur, keep), i = 0, res = [];
      (function step() {
        var until = performance.now() + 250;
        while (i < cands.length && performance.now() < until) { res.push({ b: cands[i], dps: sim(cands[i], race, cfg, nScreen).dps }); i++; }
        job.progress = i + '/' + cands.length;
        if (i < cands.length) { setTimeout(step, 0); return; }
        res.sort(function (x, y) { return y.dps - x.dps; });
        var baseC = sim(cur, race, cfg, nConfirm).dps, best = null;
        res.slice(0, 4).forEach(function (x) { var d = sim(x.b, race, cfg, nConfirm).dps; if (!best || d > best.d) best = { b: x.b, d: d }; });
        var delta = 100 * (best.d / baseC - 1);
        job.steps.push({ round: job.round, from: baseC, to: best.d, deltaPct: delta, shift: best.b.shift, split: split(best.b.talents) });
        if (delta > thresholdPct && job.round < (maxRounds || 6)) { cur = best.b; delete cur.shift; setTimeout(round, 0); }
        else { job.status = 'done'; job.final = cur; job.finalDps = baseC; }
      })();
    }
    setTimeout(round, 0);
    return key;
  }

  // Filter for neighbours()/climb(): keep only builds with at least `min` points in `tree` (round 28).
  function minTree(tree, min) {
    return function (b) { return Object.keys(b.talents).reduce(function (s, k) { return s + (WL.TALENT_BY_KEY[k].tree === tree ? b.talents[k] : 0); }, 0) >= min; };
  }

  return { validate: validate, split: split, candidates: candidates, sanity: sanity, search: search, neighbours: neighbours, pointShift: pointShift,
           climb: climb, jobs: jobs, minTree: minTree,
           rotationSearch: rotationSearch, actionVariants: actionVariants, R: R, clone: clone };
})();
