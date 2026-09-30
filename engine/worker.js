// Round 76 (performance): a Web Worker that runs simulations off the page's main thread. The page (app/app.js) starts
// one worker per CPU core (minus one) and hands out jobs; the numbers are identical to a run on the page (same engine
// files, same seeds). If workers are not available (opened from file://, blocked by the host), the page runs everything
// itself as before.
// Messages in:  { id, kind: 'combo', build, race, cfg }                 → { id, r: WL.stripResult(WL.simulate(...)) }
//               { id, kind: 'weight', build, race, cfg, n, stat|null }  → { id, dps: WL.statWeightRun(...) }
// No cfg → the worker's own WL.DEFAULT_CONFIG as shipped (no n → its weightIterations) (the tests use it: the test page changes its own copy).
// Message out on start: { ready: true } once the engine is loaded.
self.window = self;
importScripts('../data/consumables.js', '../data/config.js', '../data/talents.js', '../data/spells.js', '../data/races.js',
  '../data/builds.js', 'stats.js', 'spelltable.js', 'rng.js', 'resist.js', 'rotation.js', 'sim.js', 'custom-builds.js');

self.onmessage = function (e) {
  var j = e.data;
  if (!j.cfg) j.cfg = WL.DEFAULT_CONFIG;
  if (j.kind === 'weight' && !j.n) j.n = j.cfg.fight.weightIterations;
  try {
    if (j.kind === 'combo') self.postMessage({ id: j.id, r: WL.stripResult(WL.simulate(j.build, j.race, j.cfg)) });
    else self.postMessage({ id: j.id, dps: WL.statWeightRun(j.build, j.race, j.cfg, j.n, j.stat) });
  } catch (err) {
    self.postMessage({ id: j.id, error: String(err && err.stack || err) });
  }
};
self.postMessage({ ready: true });
