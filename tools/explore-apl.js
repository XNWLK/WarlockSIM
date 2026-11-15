// Round 218 (user: "now that we have prebis gear, run apl checks on every build. check if any dots are worth dropping
// maybe … also maybe different prio orders"): the priority search of tools/explore-builds.js, at the page's default
// settings (each build in its own Pre-BiS gear, the page's buffs and consumables, 180 s ± 10%) on each build's best race
// of data/default-results.js. Talents stay as they are. Nothing is written to data/.
//
// Accuracy: every variant fights the same seeded fights as the build it is compared with (common random numbers), split
// into chunks of 1,000 fights with their own seeds, so a difference comes with its standard error (paired, per chunk).
// Speed: all chunks of all variants go through one pool of worker threads (every CPU core).
//
// Per build:
//   1. drop each action (one at a time) at 60 / 120 / 180 / 300 s fights — the "is this DoT worth it" check;
//   2. hill-climb on the priority: remove one action, move one action, add one editor action before the filler
//      (single-target actions only); screen at S fights, the best 8 confirmed at C fights, the best confirmed move taken
//      while it gains ≥ T% and more than 2 standard errors, up to R rounds;
//   3. other fillers (reported only);
//   4. Life Tap (lifeTapNeed) mana % / seconds grid on the result.
// Usage: node tools/explore-apl.js [S=2000] [C=20000] [T=0.2] [R=3] [out=private/explore-apl.json] [buildKey,...]
const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const { load } = require(path.join(ROOT, 'tools/load-wl.js'));
const CHUNK = 1000, SEED0 = 424242;

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
const S = +A[0] || 2000, C = +A[1] || 20000, T = A[2] != null ? +A[2] : 0.2, R = +A[3] || 3;
const OUT = path.join(ROOT, A[4] || 'private/explore-apl.json');
const ONLY = A[5] ? A[5].split(',') : null;
const AOE = { multiDot: 1, shadowBoltSpread: 1, hellfire: 1, rainOfFire: 1, swapToImp: 1, swapToSuccubus: 1 };
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
// variants [{b}] × n fights (in chunks, same seeds for every variant) → per variant { dps, chunks[] }
async function run(bs, race, n, dur) {
  const k = Math.max(1, Math.round(n / CHUNK)), jobs = [];
  bs.forEach((b, v) => { for (let c = 0; c < k; c++) jobs.push({ b, race, n: CHUNK, seed: SEED0 + c * 7919, dur, v }); });
  const d = await runRaw(jobs);
  return bs.map((b, v) => { const ch = d.slice(v * k, v * k + k); return { dps: ch.reduce((a, x) => a + x, 0) / k, ch }; });
}
// paired difference of x vs base in % with its standard error
function diff(x, base) {
  const k = base.ch.length, d = x.ch.map((v, i) => v - base.ch[i]), m = d.reduce((a, v) => a + v, 0) / k;
  const sd = k > 1 ? Math.sqrt(d.reduce((a, v) => a + (v - m) * (v - m), 0) / (k - 1)) : 0;
  return { pct: 100 * m / base.dps, se: 100 * sd / Math.sqrt(k) / base.dps };
}
const fmt = d => (d.pct >= 0 ? '+' : '') + d.pct.toFixed(2) + '% ±' + d.se.toFixed(2);
const log = [];
function say(s) { console.log(s); log.push(s); }
const keep = b => !WL.validateBuild(b).length;

function rotVariants(b) {
  const out = [], seen = {}, rot = b.rotation, head = rot.slice(0, -1), filler = rot[rot.length - 1];
  const add = (r, change) => { const sig = r.join(); if (sig === rot.join() || seen[sig]) return; const c = clone(b); c.rotation = r; if (!keep(c)) return; seen[sig] = 1; c.change = change; out.push(c); };
  head.forEach((a, i) => add(head.filter((_, j) => j !== i).concat([filler]), 'remove ' + a));
  head.forEach((a, i) => { for (let p = 0; p < head.length; p++) if (p !== i) { const h = head.filter((_, j) => j !== i); h.splice(p, 0, a); add(h.concat([filler]), 'move ' + a + ' to ' + (p + 1)); } });
  WL.editorActions().filter(a => rot.indexOf(a) < 0 && !WL.ACTIONS[a].filler && !AOE[a]).forEach(a => { for (let p = 0; p <= head.length; p++) { const h = head.slice(); h.splice(p, 0, a); add(h.concat([filler]), 'add ' + a + ' at ' + (p + 1)); } });
  return out;
}
async function climb(b, race) {
  let cur = clone(b); const steps = [];
  for (let round = 1; round <= R; round++) {
    const cands = rotVariants(cur);
    const scr = await run([cur].concat(cands), race, S);
    const top = cands.map((c, i) => ({ c, s: diff(scr[i + 1], scr[0]) })).sort((x, y) => y.s.pct - x.s.pct).slice(0, 8);
    const conf = await run([cur].concat(top.map(x => x.c)), race, C);
    const rows = top.map((x, i) => ({ c: x.c, s: x.s, d: diff(conf[i + 1], conf[0]) })).sort((x, y) => y.d.pct - x.d.pct);
    say('  round ' + round + ': ' + cands.length + ' variants; base ' + conf[0].dps.toFixed(2) + ' (' + C + ' fights)');
    rows.forEach(x => say('      ' + x.c.change + ': screen ' + fmt(x.s) + ', confirm ' + fmt(x.d)));
    const best = rows[0];
    if (!best || best.d.pct < T || best.d.pct < 2 * best.d.se) break;
    steps.push({ change: best.c.change, pct: best.d.pct, se: best.d.se });
    cur = best.c; delete cur.change;
  }
  return { b: cur, steps };
}
(async () => {
  const t0 = Date.now(), res = [];
  const cfg0 = WL.pageDefaultConfig();
  say('explore-apl: page defaults (gear ' + cfg0.gearMode + '), fight ' + cfg0.fight.duration + ' s ± ' + cfg0.fight.durationVarPct + '%, screen ' + S + ', confirm ' + C +
    ', threshold ' + T + '% and 2 SE, ' + R + ' rounds, ' + pool.length + ' workers, chunks of ' + CHUNK);
  for (const b0 of WL.BUILDS) {
    if (ONLY && ONLY.indexOf(b0.key) < 0) continue;
    const race = WL.DEFAULT_RESULTS.weights[b0.key].race, r = { key: b0.key, race };
    say('\n' + b0.short + ' (' + race + '): ' + b0.rotation.join(' > '));
    // 1. drop each action, by fight length
    const head = b0.rotation.slice(0, -1), drops = head.map(a => { const c = clone(b0); c.rotation = b0.rotation.filter(x => x !== a); return c; });
    r.drop = {};
    for (const dur of [60, 120, 180, 300]) {
      const d = await run([b0].concat(drops), race, C / 2, dur);
      say('  drop one action, ' + dur + ' s (base ' + d[0].dps.toFixed(1) + '): ' + head.map((a, i) => a + ' ' + fmt(diff(d[i + 1], d[0]))).join(', '));
      r.drop[dur] = head.map((a, i) => ({ action: a, d: diff(d[i + 1], d[0]) }));
    }
    // 2. hill-climb
    const cl = await climb(b0, race); r.steps = cl.steps; r.rotation = cl.b.rotation;
    // 3. other fillers
    const filler = cl.b.rotation[cl.b.rotation.length - 1];
    const fv = WL.editorActions().filter(a => WL.ACTIONS[a].filler && a !== filler && !AOE[a]).map(a => { const c = clone(cl.b); c.rotation = cl.b.rotation.slice(0, -1).concat([a]); c.change = a; return c; }).filter(keep);
    const fd = await run([cl.b].concat(fv), race, C / 4);
    say('  other fillers (not adopted): ' + fv.map((c, i) => c.change + ' ' + fmt(diff(fd[i + 1], fd[0]))).join(', '));
    // 4. Life Tap grid
    if (cl.b.rotation.indexOf('lifeTapNeed') >= 0) {
      const p0 = (cl.b.params && cl.b.params.lifeTapNeed) || {}, g = [];
      [30, 40, 50, 60, 70, 80, 90].forEach(pct => [15, 25, 35, 45, 60].forEach(sec => { if (pct === p0.pct && sec === p0.sec) return; const c = clone(cl.b); c.params = Object.assign({}, c.params, { lifeTapNeed: { pct, sec } }); c.change = pct + '%/' + sec + 's'; g.push(c); }));
      const gs = await run([cl.b].concat(g), race, S);
      const top = g.map((c, i) => ({ c, s: diff(gs[i + 1], gs[0]) })).sort((x, y) => y.s.pct - x.s.pct).slice(0, 5);
      const gc = await run([cl.b].concat(top.map(x => x.c)), race, C);
      say('  Life Tap (now ' + p0.pct + '%/' + p0.sec + 's), best of the grid: ' + top.map((x, i) => x.c.change + ' ' + fmt(diff(gc[i + 1], gc[0]))).join(', '));
      r.lifeTap = top.map((x, i) => ({ p: x.c.change, d: diff(gc[i + 1], gc[0]) }));
    }
    // overall vs the build as shipped
    if (cl.steps.length) { const f = await run([b0, cl.b], race, C); r.total = diff(f[1], f[0]); say('  result: ' + cl.b.rotation.join(' > ') + ' — ' + fmt(r.total) + ' vs now'); }
    else say('  result: no change (nothing ≥ ' + T + '% and 2 SE)');
    res.push(r);
    fs.writeFileSync(OUT, JSON.stringify({ settings: { S, C, T, R, chunk: CHUNK }, results: res }, null, 1));
    say('  (' + ((Date.now() - t0) / 60000).toFixed(1) + ' min so far)');
  }
  say('\ndone in ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fs.writeFileSync(OUT.replace(/\.json$/, '.log'), log.join('\n'));
  pool.forEach(w => w.terminate());
})();
