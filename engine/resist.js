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
//   at 0.5 − 2.5 × its distance (mirrored from 90%); a DoT tick rolls a tenth of a. [A115]
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
// Returns { R, flat, dist, mean } for one school. R > 0 → partial resists (dist of negative steps, flat 1);
// R < 0 → vulnerable damage from Spell Pierce (positive steps). `mean` = average multiplier − 1.
WL.resistProfile = function (cfg, pierce, school, coeActive, pen, periodic) {
  var cb = cfg.combat, R = WL.effectiveResist(cfg, pierce, school, coeActive, pen);
  if (cb.resistModel === 'fitted') {                        // round 210 [A115]
    var a = WL.fittedShare(R, cb.casterLevel || 60) / (periodic ? 10 : 1), sg = a > 0 ? -1 : 1;
    var d = WL.tenthsDist(Math.abs(a)).map(function (x) { return { pct: x.tenths ? sg * x.tenths * 10 : 0, p: x.p }; });
    return { R: R, flat: 1, dist: d, mean: -a };
  }
  if (R > 0) { var mr = Math.min(0.75, cb.pierceAvgPerPoint * R); return { R: R, flat: 1, dist: WL.partialResistDist(mr), mean: -mr }; }
  if (R === 0) return { R: 0, flat: 1, dist: [{ pct: 0, p: 1 }], mean: 0 };
  var m = cb.pierceAvgPerPoint * -R;
  return { R: R, flat: 1, dist: WL.vulnerableDist(m, cb.vulnerableStepPct / 100, cb.vulnerableSpread), mean: m };
};
