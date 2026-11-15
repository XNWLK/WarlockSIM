// Round 219 (user: "make the sim use trinkets that have an on use effect, find the optimal timer for that … add the APL for
// it. make the APL a global 'activate trinket'"): when to press the on-use trinkets, per build, at the page's defaults (each
// build in its own Pre-BiS gear — Weakness Analyzer for every build — page buffs and consumables, 180 s ± 10%, best race of
// data/default-results.js). Nothing is written to data/.
//
// Variants (the "Activate trinket" action, WL.ACTIONS.activateTrinket, with or without a condition):
//   now      no action: the trinket follows its "Use" setting (with your other cooldowns: the first Bane of Doom explosion)
//   top      first in the priority, no condition: at the pull and again whenever it is ready
//   filler   right above the filler: only right before a filler cast
//   wait X   first in the priority, only once X s of the fight have gone
//   exec     first in the priority, only in the execute phase
//   pull+exec at the pull, then held for the execute phase
//   racial   with the racial cooldown (Blood Fury / Berserking up; races without one: as "top")
// Same seeded fights for every variant (common random numbers, chunks of 1,000), paired standard errors; all cores.
// Usage: node tools/explore-trinket.js [fights=20000] [durations=180,120,300] [out=private/explore-trinket.json] [buildKey,...]
const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const { load } = require(path.join(ROOT, 'tools/load-wl.js'));
const CHUNK = 1000, SEED0 = 515151;

if (!isMainThread) {
  const WL = load(ROOT, ['engine/settings-code.js']), base = WL.pageDefaultConfig();
  parentPort.on('message', j => {
    const cfg = JSON.parse(JSON.stringify(base)); cfg.fight.iterations = j.n; cfg.fight.seed = j.seed; if (j.dur) cfg.fight.duration = j.dur;
    parentPort.postMessage({ i: j.i, dps: WL.simulate(j.b, j.race, cfg, { log: false }).dps });
  });
  return;
}

const WL = load(ROOT, ['engine/settings-code.js', 'data/default-results.js']);
const A = process.argv.slice(2);
const N = +A[0] || 20000, DURS = (A[1] || '180,120,300').split(',').map(Number);
const OUT = path.join(ROOT, A[2] || 'private/explore-trinket.json');
const ONLY = A[3] ? A[3].split(',') : null;
const clone = o => JSON.parse(JSON.stringify(o));
const pool = [];
for (let k = 0; k < os.cpus().length; k++) pool.push(new Worker(__filename));
function runRaw(jobs) {
  return new Promise(res => {
    const out = new Array(jobs.length); let left = jobs.length; if (!left) return res(out);
    const q = jobs.map((j, i) => Object.assign({ i }, j));
    const feed = w => { const j = q.shift(); if (j) w.postMessage(j); };
    pool.forEach(w => { w.removeAllListeners('message'); w.on('message', m => { out[m.i] = m.dps; if (--left === 0) res(out); else feed(w); }); });
    pool.forEach(feed);
  });
}
async function run(bs, race, n, dur) {
  const k = Math.max(1, Math.round(n / CHUNK)), jobs = [];
  bs.forEach(b => { for (let c = 0; c < k; c++) jobs.push({ b, race, n: CHUNK, seed: SEED0 + c * 7919, dur }); });
  const d = await runRaw(jobs);
  return bs.map((b, v) => { const ch = d.slice(v * k, v * k + k); return { dps: ch.reduce((a, x) => a + x, 0) / k, ch }; });
}
function diff(x, base) {
  const k = base.ch.length, d = x.ch.map((v, i) => v - base.ch[i]), m = d.reduce((a, v) => a + v, 0) / k;
  const sd = k > 1 ? Math.sqrt(d.reduce((a, v) => a + (v - m) * (v - m), 0) / (k - 1)) : 0;
  return { pct: 100 * m / base.dps, se: 100 * sd / Math.sqrt(k) / base.dps, dps: m };
}
const fmt = d => (d.pct >= 0 ? '+' : '') + d.pct.toFixed(2) + '% ±' + d.se.toFixed(2);
const log = [];
function say(s) { console.log(s); log.push(s); }

function variants(b0, race) {
  const out = [], rot = b0.rotation, fi = rot.length - 1;
  const add = (name, at, when) => {
    const b = clone(b0); b.rotation = rot.slice(); b.rotation.splice(at, 0, 'activateTrinket');
    if (when) b.actWhen = Object.assign({}, b.actWhen, { activateTrinket: when });
    if (WL.validateBuild(b).length) return;
    b.variant = name; out.push(b);
  };
  add('top', 0); add('filler', fi);
  [5, 10, 15, 20, 30, 45, 60].forEach(x => add('wait ' + x, 0, { t: 'fight', what: 'elapsed', op: '>=', v: x }));
  add('exec', 0, { t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } });
  add('pull+exec', 0, { t: 'any', c: [{ t: 'fight', what: 'elapsed', op: '<', v: 10 }, { t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } }] });
  const rc = (WL.RACES[race].racials || []).filter(x => x.effect === 'cooldown')[0];
  const aura = { orc: 'bloodFury', troll: 'berserking', gnome: 'eureka' }[race];
  if (rc && aura) add('racial', 0, { t: 'aura', aura, op: '>', v: 0 });
  return out;
}

(async () => {
  const t0 = Date.now(), res = [];
  say('explore-trinket: page defaults (Pre-BiS gear), ' + N + ' fights per variant, lengths ' + DURS.join(' / ') + ' s (± 10%), ' + pool.length + ' workers');
  for (const b0 of WL.BUILDS) {
    if (ONLY && ONLY.indexOf(b0.key) < 0) continue;
    const race = WL.DEFAULT_RESULTS.weights[b0.key].race, vs = variants(b0, race), r = { key: b0.key, race, by: {} };
    say('\n' + b0.short + ' (' + race + ')');
    for (const dur of DURS) {
      const d = await run([b0].concat(vs), race, dur === 180 ? N : N / 2, dur);
      const rows = vs.map((v, i) => ({ v: v.variant, d: diff(d[i + 1], d[0]) }));
      r.by[dur] = { base: d[0].dps, rows };
      say('  ' + dur + ' s (now ' + d[0].dps.toFixed(1) + '): ' + rows.slice().sort((x, y) => y.d.pct - x.d.pct).map(x => x.v + ' ' + fmt(x.d)).join(', '));
    }
    res.push(r);
    fs.writeFileSync(OUT, JSON.stringify({ n: N, durs: DURS, results: res }, null, 1));
    say('  (' + ((Date.now() - t0) / 60000).toFixed(1) + ' min so far)');
  }
  say('\ndone in ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fs.writeFileSync(OUT.replace(/\.json$/, '.log'), log.join('\n'));
  pool.forEach(w => w.terminate());
})();
