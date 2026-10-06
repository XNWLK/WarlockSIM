// Resistance and Spell Pierce. [A43][A44]
// effective resistance R = max(0, targetResist + level resistance − CoE reduction) − Spell Pierce
//   (CoE cannot push below 0; Pierce can. Round 118, user: the curse also removes the level resistance.)
//   R > 0 → average mitigation m = pierceAvgPerPoint × R, rolled per damage event as 0/25/50/75/100%
//           partial resists with mean m (round 39; was a flat multiplier 1 − m)                       [A43]
//   R < 0 → "vulnerable" damage: each hit gains +0%, +10%, +20%, … (10% steps, user) with a
//           triangular distribution whose mean is exactly m = pierceAvgPerPoint × |R|             [A44]
window.WL = window.WL || {};

WL.effectiveResist = function (cfg, pierce, school, coeActive) {
  var cb = cfg.combat;
  var base = ((cb.targetResist && cb.targetResist[school]) || 0) + WL.levelResist(cfg);
  return Math.max(0, base - (coeActive ? cb.coeResistReduction : 0)) - (pierce || 0);
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

// Returns { R, flat, dist, mean } for one school. R > 0 → partial resists (dist of negative steps, flat 1);
// R < 0 → vulnerable damage from Spell Pierce (positive steps). `mean` = average multiplier − 1.
WL.resistProfile = function (cfg, pierce, school, coeActive) {
  var cb = cfg.combat, R = WL.effectiveResist(cfg, pierce, school, coeActive);
  if (R > 0) { var mr = Math.min(0.75, cb.pierceAvgPerPoint * R); return { R: R, flat: 1, dist: WL.partialResistDist(mr), mean: -mr }; }
  if (R === 0) return { R: 0, flat: 1, dist: [{ pct: 0, p: 1 }], mean: 0 };
  var m = cb.pierceAvgPerPoint * -R;
  return { R: R, flat: 1, dist: WL.vulnerableDist(m, cb.vulnerableStepPct / 100, cb.vulnerableSpread), mean: m };
};
