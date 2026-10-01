// Round 78 exploration: is Intensity / Fel Concentration worth points when you take a hit every N s?
// Usage: node push-explore.js <hitEvery> [screenFights] [confirmFights]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { load } = require(path.join(ROOT, 'tools/load-wl.js'));

if (!isMainThread) {
  const WL = load(ROOT);
  parentPort.on('message', j => {
    const cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    cfg.fight.hitEvery = j.hit; cfg.fight.iterations = j.n;
    parentPort.postMessage({ i: j.i, dps: WL.simulate(j.b, j.race, cfg).dps });
  });
  return;
}

const WL = load(ROOT);
const HIT = +process.argv[2] || 2, NS = +process.argv[3] || 1000, NC = +process.argv[4] || 10000;
const pool = [], queue = []; let free = [];
function run(jobs) {
  return new Promise(res => {
    const out = new Array(jobs.length); let left = jobs.length; if (!left) return res(out);
    const q = jobs.map((j, i) => Object.assign({ i }, j));
    const feed = w => { const j = q.shift(); if (j) w.postMessage(j); else free.push(w); };
    pool.forEach(w => { w.removeAllListeners('message'); w.on('message', m => { out[m.i] = m.dps; if (--left === 0) res(out); else feed(w); }); });
    free = []; pool.forEach(feed);
  });
}
for (let k = 0; k < os.cpus().length; k++) pool.push(new Worker(__filename));

// best race per build from the shipped default results
const vm = require('vm'), fs = require('fs'); const c = {}; c.window = c; vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/default-results.js'), 'utf8'), c);
const D = c.WL.DEFAULT_RESULTS, bestRace = {};
D.keys.forEach((k, i) => { const r = D.results[i]; if (!bestRace[k] || r.dps > bestRace[k].dps) bestRace[k] = { dps: r.dps, race: r.race }; });

const CHANNEL = { drainLife: 1, drainSoul: 1, wrack: 1 };
function variant(b, target, removals) {
  const t = Object.assign({}, b.talents);
  let add = 0;
  for (const [k, n] of removals) { if (k === target || (t[k] || 0) < n) return null; t[k] -= n; if (!t[k]) delete t[k]; add += n; }
  t[target] = (t[target] || 0) + add; if (t[target] > 3) return null;
  const v = Object.assign({}, b, { talents: t, key: b.key + '_v' });
  return WL.validateBuild(v).length ? null : v;
}
const fmt = r => r.map(([k, n]) => '-' + n + ' ' + WL.TALENT_BY_KEY[k].name).join(' ');

(async () => {
  const t0 = Date.now(), report = [];
  for (const b of WL.BUILDS) {
    const race = bestRace[b.key].race;
    const targets = ['intensity'].concat(b.rotation.some(a => CHANNEL[a] || (WL.ACTIONS[a] && /drain|wrack/i.test(a))) ? ['felConcentration'] : []);
    const [base] = await run([{ b, race, hit: HIT, n: NS }]);
    let best = null;
    for (const target of targets) {
      if ((b.talents[target] || 0) >= 3) continue;
      // k = 1: every 1-for-1 swap
      const singles = Object.keys(b.talents).map(k => ({ rem: [[k, 1]], v: variant(b, target, [[k, 1]]) })).filter(x => x.v);
      const r1 = await run(singles.map(x => ({ b: x.v, race, hit: HIT, n: NS })));
      singles.forEach((x, i) => { x.dps = r1[i]; });
      singles.sort((a, z) => z.dps - a.dps);
      // k = 2, 3: points taken from the 4 cheapest talents (multisets)
      const cheap = singles.slice(0, 4).map(x => x.rem[0][0]), multi = [];
      const room = 3 - (b.talents[target] || 0);
      for (let a = 0; a < cheap.length; a++) for (let z = a; z < cheap.length; z++) {
        const m2 = {}; m2[cheap[a]] = 1; m2[cheap[z]] = (m2[cheap[z]] || 0) + 1;
        if (room >= 2) multi.push(Object.entries(m2));
        for (let y = z; y < cheap.length && room >= 3; y++) { const m3 = Object.assign({}, m2); m3[cheap[y]] = (m3[cheap[y]] || 0) + 1; multi.push(Object.entries(m3)); }
      }
      const mv = multi.map(rem => ({ rem, v: variant(b, target, rem) })).filter(x => x.v);
      const rm = await run(mv.map(x => ({ b: x.v, race, hit: HIT, n: NS })));
      mv.forEach((x, i) => { x.dps = rm[i]; });
      for (const x of singles.concat(mv)) if (!best || x.dps > best.dps) best = Object.assign({ target }, x);
      if (!singles.length) report.push(b.short + ': ' + WL.TALENT_BY_KEY[target].name + ' not reachable (row gate)');
    }
    if (!best) { report.push(b.short + ' (' + race + '): no legal move'); continue; }
    const screen = (best.dps / base - 1) * 100;
    // confirm at NC fights: base vs best, at this hit rate and without hits
    const [cb, cv, c0b, c0v] = await run([{ b, race, hit: HIT, n: NC }, { b: best.v, race, hit: HIT, n: NC }, { b, race, hit: 0, n: NC }, { b: best.v, race, hit: 0, n: NC }]);
    report.push([b.short, race, '+' + (best.v.talents[best.target]) + ' ' + WL.TALENT_BY_KEY[best.target].name + ' ' + fmt(best.rem),
      'screen ' + screen.toFixed(2) + '%', NC + ': ' + cb.toFixed(1) + ' → ' + cv.toFixed(1) + ' (' + ((cv / cb - 1) * 100).toFixed(2) + '%)',
      'no hits: ' + ((c0v / c0b - 1) * 100).toFixed(2) + '%'].join(' | '));
    console.error(report[report.length - 1]);
  }
  console.log('hitEvery ' + HIT + ' s, screen ' + NS + ' / confirm ' + NC + ' fights, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  console.log(report.join('\n'));
  pool.forEach(w => w.terminate());
})();
