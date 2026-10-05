// Exploration (round 100): what happens when a build's filler is swapped for Hellfire or Rain of Fire, on 1, 2 and 3
// targets, with and without keeping DoTs on the extra targets. Information only — no build is changed.
// Usage: node tools/explore-aoe.js [fights per run, default 3000] [processes, default 12]
// Writes private/aoe-fillers.txt (local only) and prints the same table.
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { load } = require('./load-wl.js');
const ROOT = path.join(__dirname, '..');
const N = +process.argv[2] || 3000, PROCS = +process.argv[3] || 12;
const FILLERS = ['base', 'hellfire', 'rainOfFire'];
const SETUPS = [{ t: 1, md: false }, { t: 2, md: false }, { t: 2, md: true }, { t: 3, md: false }, { t: 3, md: true }];

function jobs(WL) {
  const out = [];
  WL.BUILDS.forEach((b, bi) => SETUPS.forEach((s, si) => FILLERS.forEach((f, fi) => out.push({ bi, si, fi }))));
  return out;
}
function runJob(WL, j) {
  const b = JSON.parse(JSON.stringify(WL.BUILDS[j.bi])), s = SETUPS[j.si], f = FILLERS[j.fi];
  if (f !== 'base') {
    const i = b.rotation.map(a => !!(WL.ACTIONS[a] && WL.ACTIONS[a].filler)).lastIndexOf(true);
    b.rotation[i] = f;
  }
  const cfg = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
  cfg.fight.targets = s.t; cfg.fight.multiDot = s.md;
  const r = WL.simulate(b, 'human', cfg, { iterations: N, log: false });
  return { bi: j.bi, si: j.si, fi: j.fi, dps: r.dps, taps: r.lifeTaps };
}

if (process.env.AOE_PART != null) {                       // child: do every PROCS-th job
  const WL = load(ROOT), part = +process.env.AOE_PART;
  jobs(WL).forEach((j, i) => { if (i % PROCS === part) process.stdout.write(JSON.stringify(runJob(WL, j)) + '\n'); });
} else {
  const WL = load(ROOT), t0 = Date.now(), res = [];
  let left = PROCS;
  for (let p = 0; p < PROCS; p++) {
    const ch = cp.spawn(process.execPath, [__filename, String(N), String(PROCS)], { env: Object.assign({}, process.env, { AOE_PART: String(p) }) });
    let buf = '';
    ch.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { res.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
    ch.stderr.on('data', d => process.stderr.write(d));
    ch.on('close', () => { if (--left === 0) report(WL, res, t0); });
  }
}

function report(WL, res, t0) {
  const get = (bi, si, fi) => res.filter(r => r.bi === bi && r.si === si && r.fi === fi)[0];
  const pct = (a, b) => { const d = (a / b - 1) * 100; return (d >= 0 ? '+' : '') + d.toFixed(1) + '%'; };
  const L = [];
  L.push('Hellfire / Rain of Fire as the filler — Human, ' + N + ' fights per cell, ' + WL.DEFAULT_CONFIG.fight.duration + ' s, default settings.');
  L.push('DPS = damage on all targets. "DoTs" = keep DoTs on the extra targets (Fight & pets). Change vs the build\'s own filler in the same setup.');
  L.push('');
  SETUPS.forEach((s, si) => {
    L.push('== ' + s.t + ' target' + (s.t > 1 ? 's' : '') + (s.t > 1 ? (s.md ? ', DoTs on the extra targets' : ', no DoTs on the extra targets') : '') + ' ==');
    L.push('Build'.padEnd(32) + 'own filler'.padStart(11) + 'Hellfire'.padStart(19) + 'Rain of Fire'.padStart(19));
    WL.BUILDS.forEach((b, bi) => {
      const a = get(bi, si, 0), h = get(bi, si, 1), f = get(bi, si, 2);
      L.push(b.short.padEnd(32) + a.dps.toFixed(1).padStart(11) + (h.dps.toFixed(1) + ' ' + pct(h.dps, a.dps).padStart(8)).padStart(19) + (f.dps.toFixed(1) + ' ' + pct(f.dps, a.dps).padStart(8)).padStart(19));
    });
    L.push('');
  });
  L.push('(' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  const txt = L.join('\n');
  console.log(txt);
  const dir = path.join(ROOT, 'private');
  if (fs.existsSync(dir)) fs.writeFileSync(path.join(dir, 'aoe-fillers.txt'), txt + '\n');
}
