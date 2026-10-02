// Re-optimise every built-in build under the current default settings (round 82: fight length 180 → 120 s).
// Per build, at its best race: (1) talent hill-climb — every legal 1–3 point move, screened at S fights, the best 6
// confirmed at C fights (common random numbers), the best confirmed move taken while it gains ≥ T% (default 0.5, the
// adoption rule), up to R rounds; (2) rotation search on the result — remove one action, move one action, add one
// editor action before the filler (the filler stays: other fillers are only reported); same screen / confirm / threshold, up to R rounds. Then the race is checked again.
// Nothing is written to data/; the result (JSON + a readable log) goes to the output file.
// Usage: node tools/explore-builds.js [S=500] [C=10000] [T=0.5] [R=4] [out=private/explore-builds.json] [buildKey,...]
const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const { load } = require(path.join(ROOT, 'tools/load-wl.js'));

if (!isMainThread) {
  const WL = load(ROOT);
  parentPort.on('message', j => {
    const cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); cfg.fight.iterations = j.n;
    parentPort.postMessage({ i: j.i, dps: WL.simulate(j.b, j.race, cfg).dps });
  });
  return;
}

const WL = load(ROOT);
const A = process.argv.slice(2);
const S = +A[0] || 500, C = +A[1] || 10000, T = A[2] != null ? +A[2] : 0.5, R = +A[3] || 4;
const OUT = path.join(ROOT, A[4] || 'private/explore-builds.json');
const ONLY = A[5] ? A[5].split(',') : null;
const clone = o => JSON.parse(JSON.stringify(o));
const pool = []; let free = [];
for (let k = 0; k < os.cpus().length; k++) pool.push(new Worker(__filename));
function run(jobs) {                                   // jobs: [{b, race, n}] → dps[]
  return new Promise(res => {
    const out = new Array(jobs.length); let left = jobs.length; if (!left) return res(out);
    const q = jobs.map((j, i) => Object.assign({ i }, j));
    const feed = w => { const j = q.shift(); if (j) w.postMessage(j); };
    pool.forEach(w => { w.removeAllListeners('message'); w.on('message', m => { out[m.i] = m.dps; if (--left === 0) res(out); else feed(w); }); });
    pool.forEach(feed);
  });
}
const log = [];
function say(s) { console.log(s); log.push(s); }
function split(t) {
  const s = { affliction: 0, demonology: 0, destruction: 0 };
  Object.keys(t).forEach(k => { s[WL.TALENT_BY_KEY[k].tree] += t[k]; });
  return s;
}
const splitStr = t => { const s = split(t); return s.affliction + '/' + s.demonology + '/' + s.destruction; };
// The build keeps its identity: legal for the editor, same leading tree, Demonic Pact / pet / sacrifice as before; the
// "≥ 25 Affliction" build keeps 25 (round 28).
function keeper(orig) {
  const s0 = split(orig.talents), lead = Object.keys(s0).sort((a, b) => s0[b] - s0[a])[0];
  return b => {
    if (WL.validateBuild(b).length) return false;
    const s = split(b.talents);
    if (Object.keys(s).some(k => s[k] > s[lead])) return false;
    if (!!orig.talents.demonicPact !== !!b.talents.demonicPact) return false;
    if (orig.key === 'aff_succ_sb' && s.affliction < 25) return false;
    return true;
  };
}
function neighbours(b, keep) {
  const out = [], seen = {};
  Object.keys(b.talents).forEach(from => {
    for (let k = 1; k <= Math.min(3, b.talents[from]); k++) WL.TALENTS.forEach(to => {
      if (to.key === from) return;
      const t = clone(b.talents); t[from] -= k; if (!t[from]) delete t[from]; t[to.key] = (t[to.key] || 0) + k;
      const c = clone(b); c.talents = t;
      if (!keep(c)) return;
      const sig = Object.keys(t).sort().map(x => x + t[x]).join();
      if (seen[sig]) return; seen[sig] = 1;
      c.change = '−' + k + ' ' + from + ' +' + k + ' ' + to.key; out.push(c);
    });
  });
  return out;
}
function rotVariants(b, keep) {
  const out = [], seen = {}, rot = b.rotation, head = rot.slice(0, -1), filler = rot[rot.length - 1];
  const add = (r, change) => { const sig = r.join(); if (sig === rot.join() || seen[sig]) return; const c = clone(b); c.rotation = r; if (!keep(c)) return; seen[sig] = 1; c.change = change; out.push(c); };
  head.forEach((a, i) => add(head.filter((_, j) => j !== i).concat([filler]), 'remove ' + a));
  head.forEach((a, i) => { for (let p = 0; p < head.length; p++) if (p !== i) { const h = head.filter((_, j) => j !== i); h.splice(p, 0, a); add(h.concat([filler]), 'move ' + a + ' to ' + (p + 1)); } });
  WL.editorActions().filter(a => rot.indexOf(a) < 0 && !WL.ACTIONS[a].filler).forEach(a => { for (let p = 0; p <= head.length; p++) { const h = head.slice(); h.splice(p, 0, a); add(h.concat([filler]), 'add ' + a + ' at ' + (p + 1)); } });
  return out;
}
// Other fillers (reported only: a different filler is a different build, e.g. Wrack or Drain Life → Shadow Bolt).
function fillerVariants(b, keep) {
  const out = [], head = b.rotation.slice(0, -1), filler = b.rotation[b.rotation.length - 1];
  WL.editorActions().filter(a => WL.ACTIONS[a].filler && a !== filler).forEach(a => { const c = clone(b); c.rotation = head.concat([a]); if (keep(c)) { c.change = 'filler ' + a; out.push(c); } });
  return out;
}
async function bestRace(b, n) {
  const races = WL.SIM_RACE_KEYS.filter(r => !WL.RACES[r].baseline);
  const d = await run(races.map(r => ({ b, race: r, n })));
  let bi = 0; d.forEach((x, i) => { if (x > d[bi]) bi = i; });
  return { race: races[bi], all: races.map((r, i) => r + ' ' + d[i].toFixed(1)).join(', ') };
}
async function climb(b, race, gen, label, keep) {
  let cur = clone(b), steps = [];
  for (let round = 1; round <= R; round++) {
    const cands = gen(cur, keep);
    const [base] = await run([{ b: cur, race, n: S }]);
    const scr = await run(cands.map(c => ({ b: c, race, n: S })));
    const top = cands.map((c, i) => ({ c, d: scr[i] })).sort((x, y) => y.d - x.d).slice(0, 6);
    const conf = await run([{ b: cur, race, n: C }].concat(top.map(x => ({ b: x.c, race, n: C }))));
    const baseC = conf[0];
    const best = top.map((x, i) => ({ c: x.c, d: conf[i + 1], s: x.d })).sort((x, y) => y.d - x.d)[0];
    const pct = best ? 100 * (best.d / baseC - 1) : 0;
    say('  ' + label + ' round ' + round + ': ' + cands.length + ' candidates (screen base ' + base.toFixed(1) + '); ' + C + '-fight base ' + baseC.toFixed(2) +
      (best ? '; best ' + best.c.change + ' → ' + best.d.toFixed(2) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%)' : ''));
    top.forEach((x, i) => say('      ' + x.c.change + ': screen ' + x.d.toFixed(1) + ', confirm ' + conf[i + 1].toFixed(2) + ' (' + (100 * (conf[i + 1] / baseC - 1)).toFixed(2) + '%)'));
    if (!best || pct < T) break;
    steps.push({ change: best.c.change, from: baseC, to: best.d, pct });
    cur = best.c; delete cur.change;
  }
  return { b: cur, steps };
}
(async () => {
  const t0 = Date.now(), res = [];
  say('explore-builds: fight ' + WL.DEFAULT_CONFIG.fight.duration + ' s ± ' + WL.DEFAULT_CONFIG.fight.durationVarPct + '%, screen ' + S + ', confirm ' + C + ', threshold ' + T + '%, ' + R + ' rounds, ' + pool.length + ' workers');
  for (const b0 of WL.BUILDS) {
    if (ONLY && ONLY.indexOf(b0.key) < 0) continue;
    const keep = keeper(b0);
    const r0 = await bestRace(b0, 2000);
    say('\n' + b0.short + ' (' + splitStr(b0.talents) + ') — best race ' + r0.race + ' [' + r0.all + ']');
    const tal = await climb(b0, r0.race, neighbours, 'talents', keep);
    const rot = await climb(tal.b, r0.race, rotVariants, 'rotation', keep);
    const fv = fillerVariants(rot.b, keep), fd = await run([{ b: rot.b, race: r0.race, n: C }].concat(fv.map(c => ({ b: c, race: r0.race, n: C }))));
    say('  other fillers (not adopted): ' + fv.map((c, i) => c.change.slice(7) + ' ' + (100 * (fd[i + 1] / fd[0] - 1)).toFixed(2) + '%').join(', '));
    const r1 = await bestRace(rot.b, 2000);
    const [d0, d1] = await run([{ b: b0, race: r1.race, n: C }, { b: rot.b, race: r1.race, n: C }]);
    say('  result: ' + splitStr(rot.b.talents) + ', best race ' + r1.race + '; ' + d0.toFixed(2) + ' → ' + d1.toFixed(2) + ' (' + (100 * (d1 / d0 - 1)).toFixed(2) + '%) at ' + C + ' fights');
    res.push({ key: b0.key, short: b0.short, race0: r0.race, race1: r1.race, talentSteps: tal.steps, rotationSteps: rot.steps,
               talents: rot.b.talents, rotation: rot.b.rotation, dpsOld: d0, dpsNew: d1, pct: 100 * (d1 / d0 - 1) });
    fs.writeFileSync(OUT, JSON.stringify({ settings: { S, C, T, R, duration: WL.DEFAULT_CONFIG.fight.duration }, results: res }, null, 1));
  }
  say('\ndone in ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  fs.writeFileSync(OUT.replace(/\.json$/, '.log'), log.join('\n'));
  pool.forEach(w => w.terminate());
})();
