// Exploration: Hellfire and Rain of Fire on 2 and 3 targets. Information only — no build, engine or data file is changed.
// Round 100 (first version): each build's filler swapped for Hellfire / Rain of Fire, Human, the default settings.
// Round 241 (user: "try to recalculate the 2 and 3 target dps with hellfire, see if there is a dps increase for any builds.
// with or without dots, etc."): rewritten on the page's defaults — each build in its Pre-BiS gear, the page's buffs and
// consumables, 180 s ± 10%, its best race of data/default-results.js (WL.pageDefaultConfig()), the page's healing setting
// (fight.healAmount every fight.healEvery s) — with several ways of fitting Hellfire into the priority.
//
// Setups: 1 target (reference); 2 and 3 targets with "Keep DoTs on the extra targets" (fight.multiDot) off and on; the
// multi-DoT ones again with multi-DoT above "Life Tap when needed" (see variantBuild); and 3 targets without DoTs at
// twice the page's healing (Hellfire's damage to yourself is what holds it back). Extra
// targets live the whole fight (as the engine models them). DPS = damage on all targets.
// Variants (only actions and conditions the engine already has):
//   base       the build's own priority
//   HF swap    Hellfire replaces the filler (round 100); the DoTs / curse on the boss stay above it
//   HF above   Hellfire right above the filler: the filler is cast while your health cannot pay for a whole Hellfire
//   HF > tap   Hellfire above "Life Tap when needed" (else as HF above): that Life Tap no longer clips a Hellfire it just paid for
//   HF > tap, no exec   as HF > tap, only while the boss is above the execute threshold (the filler / execute spells below it)
//   HF gated X s        as HF > tap, no exec, and only while the shortest DoT on the boss has more than X s left (the
//                       "shortest DoT" condition of "Wrack when the shortest DoT has more than _ s left"): a Hellfire is
//                       started only when no DoT refresh is about to clip it (its 1,300 mana is paid at the start)
//   RoF swap   Rain of Fire replaces the filler (for comparison)
// Same seeded fights for every variant and setup (common random numbers, chunks of 1,000), paired standard errors; all cores.
// Usage: node tools/explore-aoe.js [fights per cell, default 6000; 1 target gets half] [buildKey,... or all] [workers, default all cores]
// (round 241, user: "reduce cpu usage so my game isn't affected": e.g. 4 workers, started at low priority with
// start /low, or (Get-Process -Id <pid>).PriorityClass = 'Idle' in PowerShell)
// (round 241: 6000 → paired SE ≤ 0.1%, about 19 min on 24 workers)
// Writes private/aoe-fillers.txt (local only) and prints the same tables.
const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const { load } = require(path.join(ROOT, 'tools/load-wl.js'));
const CHUNK = 1000, SEED0 = 424242;
const clone = o => JSON.parse(JSON.stringify(o));

const SETUPS = [
  { name: '1 target', t: 1, md: false },
  { name: '2 targets, no DoTs on the extra target', t: 2, md: false },
  { name: '2 targets, DoTs on the extra target', t: 2, md: true },
  { name: '3 targets, no DoTs on the extra targets', t: 3, md: false },
  { name: '3 targets, DoTs on the extra targets', t: 3, md: true },
  { name: '2 targets, DoTs on the extra target, multi-DoT above Life Tap (all variants and base)', t: 2, md: true, mdHigh: true },
  { name: '3 targets, DoTs on the extra targets, multi-DoT above Life Tap (all variants and base)', t: 3, md: true, mdHigh: true },
  { name: '3 targets, no DoTs on the extra targets, twice the healing', t: 3, md: false, heal: 2 },
];
const VARIANTS = ['base', 'HF swap', 'HF above', 'HF > tap', 'HF > tap, no exec', 'HF gated 4 s', 'HF gated 8 s', 'RoF swap'];

// The build of one variant (rotation edits only; nothing is validated: an unconditional Hellfire above the filler is
// fine here because Hellfire is skipped while your health cannot pay for the whole channel).
// The edits start from the priority the engine simulates (WL.effectiveRotation): with multi-DoT on, "Keep DoTs on the
// extra targets" is written in at the build's own place (right above its filler), so a Hellfire placed higher does not
// drag it up with it (the engine puts it above the first filler — measured alone, multi-DoT above "Life Tap when needed"
// is worth up to +1.3% on 3 targets, which an earlier run of this tool booked as a Hellfire gain).
// Setups with mdHigh: multi-DoT moved right above "Life Tap when needed" in every variant, the base included (the
// control), so a Hellfire placed above that Life Tap still sits below multi-DoT and does not starve the extra targets'
// DoTs (with multi-DoT at its own place, "HF > tap" puts Hellfire above it: −7 … −12%).
function variantBuild(WL, b0, v, cfg, s) {
  const b = clone(b0); b.rotation = WL.effectiveRotation(b0, cfg).slice();
  const r = b.rotation;
  if (s && s.mdHigh && r.indexOf('multiDot') >= 0 && r.indexOf('lifeTapNeed') >= 0 && r.indexOf('lifeTapNeed') < r.indexOf('multiDot')) {
    r.splice(r.indexOf('multiDot'), 1); r.splice(r.indexOf('lifeTapNeed'), 0, 'multiDot');
  }
  const fi = r.map(a => !!(WL.ACTIONS[a] && WL.ACTIONS[a].filler)).lastIndexOf(true);
  const ti = r.indexOf('lifeTapNeed'), tap = ti >= 0 && ti < fi ? ti : fi;
  if (v === 'HF swap') r[fi] = 'hellfire';
  else if (v === 'HF above') r.splice(fi, 0, 'hellfire');
  else if (v === 'HF > tap') r.splice(tap, 0, 'hellfire');
  else if (v === 'HF > tap, no exec' || /^HF gated/.test(v)) {
    r.splice(tap, 0, 'hellfire');
    const c = [{ t: 'fight', what: 'bossHp', op: '>=', v: { exec: 1 } }], g = /^HF gated (\d+)/.exec(v);
    if (g) c.push({ t: 'minDot', op: '>', v: +g[1] });
    b.actWhen = Object.assign({}, b.actWhen, { hellfire: c.length > 1 ? { t: 'all', c } : c[0] });
  } else if (v === 'RoF swap') r[fi] = 'rainOfFire';
  return b;
}
function setupConfig(base, s) {
  const cfg = clone(base);
  cfg.fight.targets = s.t; cfg.fight.multiDot = s.md;
  if (s.heal) cfg.fight.healAmount = base.fight.healAmount * s.heal;
  return cfg;
}

if (!isMainThread) {
  const WL = load(ROOT, ['engine/settings-code.js', 'data/default-results.js']), base = WL.pageDefaultConfig();
  parentPort.on('message', j => {
    const b0 = WL.BUILDS.filter(b => b.key === j.key)[0], race = WL.DEFAULT_RESULTS.weights[j.key].race;
    const cfg = setupConfig(base, SETUPS[j.si]); cfg.fight.iterations = j.n; cfg.fight.seed = j.seed;
    const r = WL.simulate(variantBuild(WL, b0, VARIANTS[j.vi], cfg, SETUPS[j.si]), race, cfg, { log: false });
    const hf = r.bySpell.hellfire || {}, rf = r.bySpell.rainOfFire || {};
    parentPort.postMessage({ i: j.i, dps: r.dps, taps: r.lifeTaps, idle: r.mana.idleSecAvg, self: r.health.selfAvg,
      aoeCasts: (hf.casts || 0) + (rf.casts || 0), aoeTime: (hf.castTime || 0) + (rf.castTime || 0) });
  });
  return;
}

const WL = load(ROOT, ['engine/settings-code.js', 'data/default-results.js']), BASE = WL.pageDefaultConfig();
const A = process.argv.slice(2), N = +A[0] || 6000, ONLY = A[1] && A[1] !== 'all' ? A[1].split(',') : null;
const WORKERS = Math.max(1, Math.min(os.cpus().length, +A[2] || os.cpus().length));
const BUILDS = WL.BUILDS.filter(b => !ONLY || ONLY.indexOf(b.key) >= 0);
const pool = [];
for (let k = 0; k < WORKERS; k++) pool.push(new Worker(__filename));

// Resume (round 241, after the user paused a run: "continue the hellfire run"): every finished build × setup is kept in
// private/aoe-fillers.cache.json with a fingerprint of the run (fights, seeds, setups, variants, and the contents of
// engine/ and data/); a rerun with the same fingerprint skips those groups. The cache is deleted when the run completes.
const CACHE = path.join(ROOT, 'private', 'aoe-fillers.cache.json');
const FP = (function () {
  const h = require('crypto').createHash('sha1');
  h.update(JSON.stringify({ N, CHUNK, SEED0, SETUPS, VARIANTS, src: fs.readFileSync(__filename, 'utf8') }));
  ['engine', 'data'].forEach(d => fs.readdirSync(path.join(ROOT, d)).filter(f => /\.js$/.test(f)).sort()
    .forEach(f => { h.update(f); h.update(fs.readFileSync(path.join(ROOT, d, f))); }));
  return h.digest('hex');
})();
let cache = {};
try { const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); if (c.fp === FP) cache = c.groups || {}; } catch (e) { /* no cache */ }
function saveCache() {
  if (!fs.existsSync(path.dirname(CACHE))) return;
  const gs = {}; groups.filter(g => g.left === 0).forEach(g => { gs[g.key + '|' + g.si] = g.out; });
  try { fs.writeFileSync(CACHE, JSON.stringify({ fp: FP, groups: gs })); } catch (e) { /* not essential */ }
}

const t0 = Date.now(), groups = [], jobs = [];
let resumed = 0;
BUILDS.forEach(b => SETUPS.forEach((s, si) => {
  const k = Math.max(2, Math.round((s.t === 1 ? N / 2 : N) / CHUNK)), g = { key: b.key, short: b.short, si, k, left: VARIANTS.length * k, out: VARIANTS.map(() => []) };
  groups.push(g);
  const hit = cache[b.key + '|' + si];
  if (hit) { g.out = hit; g.left = 0; resumed++; return; }
  VARIANTS.forEach((v, vi) => { for (let c = 0; c < k; c++) jobs.push({ g: groups.length - 1, vi, c, key: b.key, si, n: CHUNK, seed: SEED0 + c * 7919 }); });
}));
console.log('explore-aoe (round 241): page defaults (Pre-BiS gear, best race), ' + N + ' fights per cell (1 target: ' + N / 2 + '), ' +
  BUILDS.length + ' builds x ' + SETUPS.length + ' setups x ' + VARIANTS.length + ' variants = ' + jobs.length + ' chunks of ' + CHUNK + ' to run' +
  (resumed ? ' (' + resumed + ' build x setup groups taken from the cache of a stopped run)' : '') + ', ' + pool.length + ' workers');

function mean(a, f) { return a.reduce((s, x) => s + x[f], 0) / a.length; }
function diff(x, b) {                                  // paired over the chunks: % of the base and its standard error
  const k = b.length, d = x.map((v, i) => v.dps - b[i].dps), m = d.reduce((a, v) => a + v, 0) / k, bd = mean(b, 'dps');
  const sd = k > 1 ? Math.sqrt(d.reduce((a, v) => a + (v - m) * (v - m), 0) / (k - 1)) : 0;
  return { pct: 100 * m / bd, se: 100 * sd / Math.sqrt(k) / bd };
}
const sgn = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);

let done = 0;
const q = jobs.map((j, i) => Object.assign({ i }, j));
function finishGroup(g) {
  const b = g.out[0], line = VARIANTS.slice(1).map((v, i) => v + ' ' + sgn(diff(g.out[i + 1], b).pct)).join(', ');
  console.log('[' + ((Date.now() - t0) / 60000).toFixed(1) + ' min, ' + done + '/' + jobs.length + '] ' + g.short + ', ' + SETUPS[g.si].name + ': base ' + mean(b, 'dps').toFixed(1) + '; ' + line);
}
pool.forEach(w => w.on('message', m => {
  const j = jobs[m.i], g = groups[j.g];
  g.out[j.vi][j.c] = m; done++;
  if (--g.left === 0) { finishGroup(g); saveCache(); }
  if (done === jobs.length) report(); else { const n = q.shift(); if (n) w.postMessage(n); }
}));
if (!jobs.length) report();
else pool.forEach(w => { const n = q.shift(); if (n) w.postMessage(n); });

function report() {
  const L = [];
  L.push('Hellfire / Rain of Fire on 1-3 targets (round 241) - page defaults: each build in its Pre-BiS gear, buffs and consumables,');
  L.push(BASE.fight.duration + ' s +- ' + BASE.fight.durationVarPct + '%, best race; healing ' + BASE.fight.healAmount + ' every ' + BASE.fight.healEvery + ' s; ' + N + ' fights per cell (1 target: ' + N / 2 + '),');
  L.push('same seeded fights for every cell (chunks of ' + CHUNK + '). DPS = damage on all targets; % = change vs the build\'s own priority in the');
  L.push('same setup, +- its paired standard error. taps = Life Taps per fight; AoE s = seconds spent channelling Hellfire / Rain of Fire');
  L.push('(casts); self = health lost to yourself per fight (Hellfire ticks, Demonic Rune, Sapper).');
  SETUPS.forEach((s, si) => {
    L.push('');
    L.push('== ' + s.name + ' ==');
    L.push('Build'.padEnd(20) + 'base'.padStart(8) + VARIANTS.slice(1).map(v => v.padStart(19)).join(''));
    groups.filter(g => g.si === si).forEach(g => {
      const b = g.out[0];
      L.push(g.short.padEnd(20) + mean(b, 'dps').toFixed(1).padStart(8) + VARIANTS.slice(1).map((v, i) => {
        const d = diff(g.out[i + 1], b); return (sgn(d.pct) + '% +-' + d.se.toFixed(2)).padStart(19);
      }).join(''));
    });
    L.push('  details: DPS, taps, AoE s (casts), self');
    groups.filter(g => g.si === si).forEach(g => {
      L.push('  ' + g.short.padEnd(20) + VARIANTS.map((v, vi) => {
        const o = g.out[vi];
        return v + ' ' + mean(o, 'dps').toFixed(1) + ' / ' + mean(o, 'taps').toFixed(1) + ' / ' + mean(o, 'aoeTime').toFixed(1) + ' (' + mean(o, 'aoeCasts').toFixed(1) + ') / ' + mean(o, 'self').toFixed(0);
      }).join(' | '));
    });
  });
  L.push('');
  L.push('(' + ((Date.now() - t0) / 60000).toFixed(1) + ' min, ' + pool.length + ' workers)');
  const txt = L.join('\n');
  console.log('\n' + txt);
  const dir = path.join(ROOT, 'private');
  if (fs.existsSync(dir)) fs.writeFileSync(path.join(dir, 'aoe-fillers.txt'), txt + '\n');
  try { fs.unlinkSync(CACHE); } catch (e) { /* none */ }
  pool.forEach(w => w.terminate());
}
