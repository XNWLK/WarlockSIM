// Loads the engine (data + engine files, the same list as engine/worker.js) into a fresh Node context and returns WL.
// Used by tools/gen-default-results.js. SOURCE_FILES = the files whose contents decide the simulated numbers.
const fs = require('fs'), vm = require('vm'), path = require('path');
const SOURCE_FILES = ['data/consumables.js', 'data/config.js', 'data/talents.js', 'data/spells.js', 'data/races.js', 'data/builds.js',
  'engine/stats.js', 'engine/spelltable.js', 'engine/rng.js', 'engine/resist.js', 'engine/rotation.js', 'engine/sim.js', 'engine/custom-builds.js'];
function load(root, extra) {
  const ctx = { console, Math, JSON, Date }; ctx.window = ctx; vm.createContext(ctx);
  SOURCE_FILES.concat(extra || []).forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return ctx.WL;
}
module.exports = { load, SOURCE_FILES };
