// Decision search, one global at a time (round 186, user: "find the perfect rotation global to global, down to even
// life tap timings"). For sample fights of a build it replays the fight exactly and, at every decision — each free
// decision and each tick of a running channel (keep channelling or clip) — tries every spell you could cast there, plus
// Life Tap, then lets the build's own priority play the rest of the fight out K times. The dice after the choice are the
// same for every option (the engine reseeds them at the branch), so the difference between two options is mostly the
// choice itself. Output: one JSON line per decision with the state and every option's damage gain over the priority's
// own choice (mean and standard error of the paired difference).
//
//   node tools/explore-oracle.js <buildKey> [race=undead] [fights=4] [K=120] [K2=600] [out=oracle.jsonl] [firstFight=0]
//     options via env: CANDS=wrack,shadowBolt,...   BUILD_JSON=<file with a build object to use instead of the key>
//                      WORKERS=<n> (default: cores − 2)
// Stage 1 runs K rollouts per option; options within 2.5 standard errors of the best one get K2 more.
const os = require('os'), fs = require('fs'), path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const root = path.join(__dirname, '..');

function loadAll() { return require('./load-wl.js').load(root, ['tests/retired-builds.js']); }
function getBuild(WL, key) {
  if (process.env.BUILD_JSON) return JSON.parse(fs.readFileSync(process.env.BUILD_JSON, 'utf8'));
  const b = WL.findBuild(key); if (!b) throw new Error('unknown build ' + key); return b;
}
const DEF_CANDS = ['wrack', 'shadowBolt', 'corruption', 'baneOfAgony', 'baneOfDoom', 'siphonLife', 'curseOfElements', 'immolate',
  'deathCoil', 'drainLife', 'conflagrate', 'shadowburn', 'incinerate', 'searingPain', 'soulFire', 'lifeTap'];

function seedOf(f, n, k) { let h = (f * 73856093) ^ (n * 19349663) ^ (k * 83492791); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); return (h ^ (h >>> 13)) >>> 0; }

if (!isMainThread) {
  const WL = loadAll(), { key, race, cands } = workerData, build = getBuild(WL, key), cfg = WL.DEFAULT_CONFIG;
  const stats = WL.computeStats(build, race, cfg), table = WL.buildSpellTable(build, stats, cfg);
  parentPort.on('message', j => {
    const fp = WL.fightParams(cfg, j.fight), out = {};
    j.opts.forEach(o => {
      const a = [];
      for (let k = j.k0; k < j.k1; k++) {
        const r = WL.simulateOnce(build, race, cfg, { stats, table, seed: fp.seed, duration: fp.duration, ctl: { at: j.n, key: o, seed: seedOf(j.fight, j.n, k), cands } });
        a.push(r.ctlIllegal ? NaN : r.total);
      }
      out[o] = a;
    });
    parentPort.postMessage({ id: j.id, out });
  });
  return;
}

(async () => {
  const [key, race = 'undead', nF = '4', K = '120', K2 = '600', outFile = 'oracle.jsonl', f0 = '0'] = process.argv.slice(2);
  const WL = loadAll(), build = getBuild(WL, key), cfg = WL.DEFAULT_CONFIG;
  const cands = process.env.CANDS ? process.env.CANDS.split(',') : DEF_CANDS;
  const stats = WL.computeStats(build, race, cfg), table = WL.buildSpellTable(build, stats, cfg);
  const nW = +process.env.WORKERS || Math.max(1, os.cpus().length - 2);
  const workers = [], idle = [], queue = [], waiting = {};
  let jid = 0;
  for (let i = 0; i < nW; i++) {
    const w = new Worker(__filename, { workerData: { key, race, cands } });
    w.on('message', m => { const cb = waiting[m.id]; delete waiting[m.id]; idle.push(w); pump(); cb(m.out); });
    w.on('error', e => { console.error(e); process.exit(1); });
    workers.push(w); idle.push(w);
  }
  function pump() { while (idle.length && queue.length) { const w = idle.pop(), j = queue.shift(); waiting[j.id] = j.cb; delete j.cb; w.postMessage(j); } }
  function run(fight, n, opts, k0, k1) {
    // split the rollouts into chunks so all workers share a decision
    const chunks = [], step = Math.max(10, Math.ceil((k1 - k0) / 4));
    for (let a = k0; a < k1; a += step) chunks.push([a, Math.min(k1, a + step)]);
    return Promise.all(chunks.map(c => new Promise(res => { queue.push({ id: ++jid, fight, n, opts, k0: c[0], k1: c[1], cb: res }); pump(); })))
      .then(parts => { const o = {}; opts.forEach(x => { o[x] = [].concat(...parts.map(p => p[x])); }); return o; });
  }
  const stat = (base, a) => {   // paired difference a − base
    const d = []; for (let i = 0; i < a.length; i++) if (!isNaN(a[i]) && !isNaN(base[i])) d.push(a[i] - base[i]);
    const m = d.reduce((s, x) => s + x, 0) / Math.max(1, d.length), v = d.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, d.length - 1);
    return { d: +m.toFixed(1), se: +Math.sqrt(v / Math.max(1, d.length)).toFixed(1), n: d.length };
  };
  const out = fs.createWriteStream(outFile, { flags: 'a' });
  const t0 = Date.now();
  for (let f = +f0; f < +f0 + +nF; f++) {
    const fp = WL.fightParams(cfg, f), dec = [];
    const baseRun = WL.simulateOnce(build, race, cfg, { stats, table, seed: fp.seed, duration: fp.duration, ctl: { at: -1, cands, observe: info => {
      const S = info.S, dl = k => +S.dotLeft(k).toFixed(2);
      const legal = info.legal.slice(); if (info.kind === 'c' && info.base !== 'continue') legal.push('continue');
      dec.push({ f, n: info.n, kind: info.kind, t: +info.t.toFixed(3), left: +S.remaining.toFixed(2), dur: +fp.duration.toFixed(2),
        manaPct: +(100 * S.mana / S.maxMana).toFixed(1), mana: Math.round(S.mana), hp: Math.round(S.health),
        fsr: info.spendAt != null ? -1 : +(info.t - info.lastSpend).toFixed(2),
        chan: S.channel ? S.channel.key + '@' + (info.t - S.channel.start).toFixed(1) : '',
        dots: { cor: dl('corruption'), boa: dl('baneOfAgony'), bod: dl('baneOfDoom'), sl: dl('siphonLife'), imm: dl('immolate') },
        coe: S.buff('coe') ? +(S.buffs.coe - S.t).toFixed(1) : 0, st: S.buff('shadowTrance') ? 1 : 0,
        dc: S.ready('deathCoil') ? 0 : +(S.cds.deathCoil - S.t).toFixed(1), bodCd: S.ready('baneOfDoom') ? 0 : +(S.cds.baneOfDoom - S.t).toFixed(1),
        base: info.base, legal });
    } } });
    console.log('fight ' + f + ': ' + dec.length + ' decisions, base total ' + Math.round(baseRun.total) + ' (' + (baseRun.total / fp.duration).toFixed(1) + ' DPS, ' + fp.duration.toFixed(1) + ' s)');
    let done = 0;
    await Promise.all(dec.map(async x => {
      if (!x.legal.length) { x.res = {}; out.write(JSON.stringify(x) + '\n'); return; }
      const base = x.base == null ? 'idle' : x.base, opts = [x.base].concat(x.legal);
      let r = await run(f, x.n, opts, 0, +K);
      let s = {}; x.legal.forEach(o => { s[o] = stat(r[x.base], r[o]); });
      const best = Math.max(0, ...x.legal.map(o => s[o].d));
      const close = x.legal.filter(o => s[o].d + 2.5 * s[o].se >= best - 2.5 * (s[o].se || 1) && s[o].d > -400);
      if (+K2 > 0 && close.length) {
        const r2 = await run(f, x.n, [x.base].concat(close), +K, +K + +K2);
        close.concat([x.base]).forEach(o => { r[o] = r[o].concat(r2[o]); });
        x.legal.forEach(o => { if (close.indexOf(o) >= 0) s[o] = stat(r[x.base], r[o]); });
      }
      x.res = s; x.baseLabel = base;
      out.write(JSON.stringify(x) + '\n');
      if (++done % 25 === 0) console.log('  fight ' + f + ': ' + done + '/' + dec.length + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
    }));
  }
  out.end();
  console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  workers.forEach(w => w.terminate());
})();
