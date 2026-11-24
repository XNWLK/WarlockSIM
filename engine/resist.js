// Resistance and Spell Pierce. [A43][A44]
// effective resistance R = max(0, targetResist + level resistance − CoE reduction − Spell Penetration) − Spell Pierce
//   (CoE and Spell Penetration cannot push below 0; Pierce can. Round 118, user: the curse also removes the level
//   resistance. Round 155, user: Spell Penetration only lowers resistance down to 0 [A96].)
//   R > 0 → average mitigation m = pierceAvgPerPoint × R, rolled per damage event as 0/25/50/75/100%
//           partial resists with mean m (round 39; was a flat multiplier 1 − m)                       [A43]
//   R < 0 → "vulnerable" damage: each hit gains +0%, +10%, +20%, … (10% steps, user) with a
//           triangular distribution whose mean is exactly m = pierceAvgPerPoint × |R|             [A44]
window.WL = window.WL || {};

WL.effectiveResist = function (cfg, pierce, school, coeActive, pen) {
  var cb = cfg.combat;
  var base = ((cb.targetResist && cb.targetResist[school]) || 0) + WL.levelResist(cfg);
  return Math.max(0, base - (coeActive ? cb.coeResistReduction : 0) - (pen || 0)) - (pierce || 0);
};

// Probability distribution over vulnerable-damage steps with an exact mean `m` (fraction, e.g. 0.0375).
WL.vulnerableDist = function (m, step, spread) {
  if (!(m > 1e-12)) return [{ pct: 0, p: 1 }];
  var maxK = Math.ceil((m + 2 * spread) / step) + 1;
  function weights(c) {
    var w = [], sum = 0;
    for (var k = 0; k <= maxK; k++) { var x = Math.max(0, spread - Math.abs(k * step - c)); w.push(x); sum += x; }
    return w.map(function (x) { return x / sum; });
  }
  function mean(c) { return weights(c).reduce(function (a, p, k) { return a + p * k * step; }, 0); }
  // mean(c) increases with c; bisection for mean(c) = m.
  var lo = -spread + 1e-9, hi = m + spread;
  for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (mean(mid) < m) lo = mid; else hi = mid; }
  return weights((lo + hi) / 2).map(function (p, k) { return { pct: +(k * step * 100).toFixed(6), p: p }; })
    .filter(function (o) { return o.p > 1e-12; });
};

// Partial resists (round 39, A43): each damage event is resisted by 0 / 25 / 50 / 75 / 100% with a distribution whose
// mean is exactly the average mitigation m (a triangle two chunks wide around the mean, clipped to 0…100%).
WL.partialResistDist = function (m) {
  m = Math.min(0.75, Math.max(0, m));
  if (!(m > 1e-12)) return [{ pct: 0, p: 1 }];
  var step = 0.25, half = 0.5;
  function weights(c) {
    var w = [], sum = 0;
    for (var k = 0; k <= 4; k++) { var x = Math.max(0, half - Math.abs(k * step - c)); w.push(x); sum += x; }
    return w.map(function (x) { return x / sum; });
  }
  function mean(c) { return weights(c).reduce(function (a, p, k) { return a + p * k * step; }, 0); }
  var lo = -half + 1e-9, hi = 1 + half;
  for (var i = 0; i < 100; i++) { var mid = (lo + hi) / 2; if (mean(mid) < m) lo = mid; else hi = mid; }
  return weights((lo + hi) / 2).map(function (p, k) { return { pct: -k * 25, p: p }; }).filter(function (o) { return o.p > 1e-12; });
};

// Level-based resistance: +8 per level the target is above you; a level-63 boss = +24. On by default since round 118
// (user: it exists in Forever and Curse of the Elements can reduce it to 0), so it is part of the resistance the curse
// reduces. Rounds 39–117: optional, off, and added after the curse (Classic: it cannot be reduced).
WL.levelResist = function (cfg) {
  var lr = cfg.combat.levelResist;
  return lr && lr.on ? lr.perLevel * lr.levelDiff : 0;
};

// Round 210 (user: "play around with [a Spell Piercing calculator] to get the math on spell pierce"): a model fitted to
// Forever combat logs (levels 20–50). combat.resistModel 'fitted':
//   average share a = R / (|R| + 8 × your level + 19)  (R as above; a > 0 resisted, a < 0 bonus damage from Spell Pierce)
//   each hit rolls whole tenths: up to a = 10%: 0 / 1 / 2 tenths at 1 − 7.5a, 5a, 2.5a; past it every tenth within 20% of a
//   at 0.5 − 2.5 × its distance (mirrored from 90%); a DoT tick rolls a tenth of a. [A115] Round 241: a resisted step
//   above 75% is a 75% partial (WL.resistProfile) [A130].
// 'classic' (rounds 39–209): the mean 0.75 × R / 300, 25% resist chunks / 10% bonus steps around it, ticks as hits.
WL.fittedShare = function (R, level) { return R / (Math.abs(R) + 8 * (level || 60) + 19); };
WL.tenthsDist = function (a) {                            // a ≥ 0 → [{ tenths, p }]
  if (!(a > 1e-12)) return [{ tenths: 0, p: 1 }];
  if (a <= 0.1) return [{ tenths: 0, p: 1 - 7.5 * a }, { tenths: 1, p: 5 * a }, { tenths: 2, p: 2.5 * a }];
  if (a >= 0.9) { var b = 1 - a; return [{ tenths: 8, p: 2.5 * b }, { tenths: 9, p: 5 * b }, { tenths: 10, p: 1 - 7.5 * b }]; }
  var out = [];
  for (var k = 0; k <= 10; k++) { var p = 0.5 - 2.5 * Math.abs(k / 10 - a); if (p > 1e-12) out.push({ tenths: k, p: p }); }
  return out;
};
// Returns { R, flat, dist, mean, share } for one school. R > 0 → partial resists (dist of negative steps, flat 1);
// R < 0 → vulnerable damage from Spell Pierce (positive steps). `mean` = average multiplier − 1; `share` = the average
// share before the 75% cap (resisted > 0, bonus < 0): a binary spell's full-resist chance.
// Round 241 (user picked "Cap partials at 75%"; public evidence notes of live-realm combat logs and Warcraft Logs reports
// (Forever 1.60.1.70862–71037, 2026-09-27 to 2026-11-22): every partial resist on landed hits of 50+ damage falls on a
// 10% step up to 70% or exactly 75%, none in between or above, about 25,000 resisted hits) [A130]: a resisted step
// above 75% (an 80 / 90 / 100% tenth) is a 75% partial. Only the resisted side; Spell Pierce bonus steps are not capped.
WL.PARTIAL_CAP_PCT = 75;
WL.resistProfile = function (cfg, pierce, school, coeActive, pen, periodic) {
  var cb = cfg.combat, R = WL.effectiveResist(cfg, pierce, school, coeActive, pen);
  if (cb.resistModel === 'fitted') {                        // round 210 [A115]
    var a = WL.fittedShare(R, cb.casterLevel || 60) / (periodic ? 10 : 1), sg = a > 0 ? -1 : 1, mean = -a, d = [];
    WL.tenthsDist(Math.abs(a)).forEach(function (x) {
      var pct = x.tenths ? sg * x.tenths * 10 : 0;
      if (pct < -WL.PARTIAL_CAP_PCT) { mean += x.p * (-pct - WL.PARTIAL_CAP_PCT) / 100; pct = -WL.PARTIAL_CAP_PCT; }   // round 241 [A130]
      var o = d.filter(function (y) { return y.pct === pct; })[0];
      if (o) o.p += x.p; else d.push({ pct: pct, p: x.p });
    });
    return { R: R, flat: 1, dist: d, mean: mean, share: a };
  }
  if (R > 0) { var mr = Math.min(0.75, cb.pierceAvgPerPoint * R); return { R: R, flat: 1, dist: WL.partialResistDist(mr), mean: -mr, share: mr }; }
  if (R === 0) return { R: 0, flat: 1, dist: [{ pct: 0, p: 1 }], mean: 0, share: 0 };
  var m = cb.pierceAvgPerPoint * -R;
  return { R: R, flat: 1, dist: WL.vulnerableDist(m, cb.vulnerableStepPct / 100, cb.vulnerableSpread), mean: m, share: -m };
};

// Round 239 (user pasted notes on how resists work for each Warlock spell, and a table of Spell Piercing before / after
// hotfix 114309, live 2026-11-19 ~22:00 UTC) [A128]. Each spell follows one of three rules:
//   binary  — the whole cast lands or is resisted: while resistance is left (R > 0) it is fully resisted with the chance of
//             the average share (the hit-type average); its hit and ticks then roll no partial resists. Immolate (hit and
//             ticks), Bane of Agony, Drain Soul, Death Coil, Shadowburn, Incinerate.
//   hit     — a direct hit: partial resists, and Spell Pierce bonus damage once R < 0 (Shadow Bolt, Searing Pain, Soul Fire,
//             Conflagrate, Hellfire's hits on enemies). Since the hotfix the binary direct hits get the bonus too (Immolate's
//             hit, Incinerate; Shadowburn and Death Coil are not in the table and are taken to be like them).
//   tick    — DoT and channel ticks (Corruption, Siphon Life, Bane of Doom, Drain Life, Wrack; Wrack's extra ticks follow the
//             DoT they belong to): partial resists at a tenth of the average, never bonus damage.
// Rain of Fire gets no bonus (the table's "Ground effects: None"). Round 241 (user picked "Rain of Fire ticks: a tenth";
// public evidence notes of live-realm combat logs and Warcraft Logs reports (Forever 1.60.1.70862–71037, 2026-09-27 to
// 2026-11-22): resisted share / average share = 0.12 over 738 Rain of Fire ticks, 232 of them partially resisted, while
// Hellfire's ticks beside it gave 0.99 over 2,810) [A130]: its ticks roll partial resists at a tenth of the share, like DoT
// ticks (tickShare); rounds 239–240 rolled them like hits. Hellfire keeps the full share.
// Curses and Life Tap ignore resistance; Bane of Havoc copies damage after it was resisted (no roll of its own).
WL.RESIST_RULES = {
  immolate: { binary: 1 }, incinerate: { binary: 1 }, shadowburn: { binary: 1 }, deathCoil: { binary: 1 },
  baneOfAgony: { binary: 1 }, drainSoul: { binary: 1 },
  rainOfFire: { noBonus: 1, tickShare: 1 }
};
// { R, flat, dist, mean, landP } for one damage event of spell `key` (tick: a periodic tick). landP = chance a binary
// spell is not resisted (1 for the others; the hit / tick dist then carries no resist).
WL.spellResist = function (cfg, pierce, school, coeActive, pen, key, tick) {
  var rule = WL.RESIST_RULES[key] || {}, R = WL.effectiveResist(cfg, pierce, school, coeActive, pen), none = [{ pct: 0, p: 1 }];
  if (R > 0) {
    // A binary spell's full resist is not a partial: the 75% cap does not touch it (round 241) [A130].
    if (rule.binary) { var h = WL.resistProfile(cfg, pierce, school, coeActive, pen, false); return { R: R, flat: 1, dist: none, mean: 0, landP: Math.max(0, 1 - h.share) }; }
    var p = WL.resistProfile(cfg, pierce, school, coeActive, pen, tick || !!rule.tickShare); p.landP = 1; return p;   // tickShare: Rain of Fire (round 241) [A130]
  }
  if (R < 0 && !tick && !rule.noBonus && WL.pierceBonusOn(cfg, R)) { var b = WL.resistProfile(cfg, pierce, school, coeActive, pen, false); b.landP = 1; return b; }
  return { R: R, flat: 1, dist: none, mean: 0, landP: 1 };
};
// Round 249 (the user's pick; a public log study / public evidence notes, Forever, 2026-11-23: about 150,000 hits of casters
// with gear piercing, read against the share): Spell Pierce beyond the resistance gives no bonus while its share
// |R| / (|R| + 8 × your level + 19) is under 1%; from 1% the bonus follows the share as before. At level 60, 5 Spell Pierce
// make 0.992% (no bonus) and 6 make 1.19% (a bonus). The share is not rounded. Rounds 239–248: any R < 0 gave a bonus.
WL.PIERCE_MIN_SHARE = 0.01;
WL.pierceBonusOn = function (cfg, R) { return R < 0 && WL.fittedShare(-R, cfg.combat.casterLevel || 60) >= WL.PIERCE_MIN_SHARE; };
// Demons (round 239): resisted by the boss's resistance (after Curse of the Elements) but get none of your Spell Pierce or
// Spell Penetration. Imp Firebolt is binary; Lash of Pain and Demonic Brand are partially resisted (steps capped at 75%,
// round 241, A130).
WL.PET_BINARY = { firebolt: 1 };
WL.petResist = function (cfg, school, coeActive, petKey) {
  var R = WL.effectiveResist(cfg, 0, school, coeActive, 0), none = [{ pct: 0, p: 1 }];
  if (!(R > 0)) return { R: R, flat: 1, dist: none, mean: 0, landP: 1 };
  var h = WL.resistProfile(cfg, 0, school, coeActive, 0, false);
  if (WL.PET_BINARY[petKey]) return { R: R, flat: 1, dist: none, mean: 0, landP: Math.max(0, 1 - h.share) };
  h.landP = 1; return h;
};
