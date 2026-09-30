// Round 76 (performance): run simulation jobs on a pool of Web Workers (engine/worker.js), one per CPU core (1–8; the
// page itself only renders meanwhile). Falls back to the page's main thread (time-sliced, as before round 76) when workers cannot start — opened from
// file://, blocked by the host, or no "ready" within a few seconds — or when a worker fails mid-run (its job is redone on
// the page). Both paths call the same engine functions with the same seeds, so the numbers are identical.
//   WL.SimPool.run(jobs, onResult(job, res), onDone())  — jobs: { kind: 'combo', build, race, cfg } → res = { r }
//                                                          or { kind: 'weight', build, race, cfg, n, stat } → res = { dps }
//   WL.SimPool.mode()                                   — 'workers (N)' | 'page' | 'starting'
//   WL.makeSimPool(workerUrl, size)                      — another pool (tests: a path relative to tests/, a missing file)
window.WL = window.WL || {};

WL.makeSimPool = function (workerUrl, size) {
  var workers = null, state = 'new', readyWaiters = [], READY_MS = 6000;

  function runOnPage(j) {                             // the same work a worker does
    return j.kind === 'combo' ? { r: WL.stripResult(WL.simulate(j.build, j.race, j.cfg)) }
      : { dps: WL.statWeightRun(j.build, j.race, j.cfg, j.n, j.stat) };
  }
  function start(cb) {
    if (state === 'ready' || state === 'page') { cb(); return; }
    readyWaiters.push(cb);
    if (state === 'starting') return;
    state = 'starting';
    var n = size || Math.max(1, Math.min(8, navigator.hardwareConcurrency || 2)), ready = 0, settled = false;
    function settle(ok) {
      if (settled) return; settled = true;
      if (!ok) { (workers || []).forEach(function (w) { try { w.terminate(); } catch (e) {} }); workers = null; }
      else workers = workers.filter(function (w) { return w.ready; });
      state = ok && workers.length ? 'ready' : 'page';
      var ws = readyWaiters; readyWaiters = []; ws.forEach(function (f) { f(); });
    }
    try {
      if (typeof Worker === 'undefined') throw new Error('no Worker');
      workers = [];
      for (var i = 0; i < n; i++) {
        var w = new Worker(workerUrl);
        w.onmessage = (function (w) { return function (e) { if (e.data && e.data.ready && !w.ready) { w.ready = true; if (++ready === n) settle(true); } }; })(w);
        w.onerror = function () { if (!settled) settle(ready > 0); };
        workers.push(w);
      }
      setTimeout(function () { settle(ready > 0); }, READY_MS);   // slow or blocked: go with the ones that answered
    } catch (e) { settle(false); }
  }

  function run(jobs, onResult, onDone) {
    start(function () {
      var next = 0, left = jobs.length;
      if (!left) { onDone(); return; }
      function finish(j, res) { onResult(j, res); if (--left === 0) onDone(); }
      function slice() {                              // page fallback: 60 ms slices keep the page responsive
        var until = performance.now() + 60;
        while (next < jobs.length && performance.now() < until) { var j = jobs[next++]; finish(j, runOnPage(j)); }
        if (next < jobs.length) setTimeout(slice, 0);
      }
      if (state !== 'ready') { slice(); return; }
      var id = 0;
      function feed(w) {
        if (next >= jobs.length) { w.job = null; return; }
        var j = jobs[next++], k = ++id; w.job = { id: k, j: j };
        w.postMessage({ id: k, kind: j.kind, build: j.build, race: j.race, cfg: j.cfg, n: j.n, stat: j.stat });
      }
      workers.forEach(function (w) {
        w.onmessage = function (e) {
          var cur = w.job; if (!cur || !e.data || e.data.id !== cur.id) return;
          var res = e.data.error ? runOnPage(cur.j) : e.data;   // a job that failed in the worker is redone on the page
          feed(w); finish(cur.j, res);
        };
        w.onerror = function (ev) {                   // a broken worker: drop it, redo its job on the page
          if (ev && ev.preventDefault) ev.preventDefault();
          var cur = w.job; w.job = null; workers = workers.filter(function (x) { return x !== w; });
          try { w.terminate(); } catch (e) {}
          if (cur) finish(cur.j, runOnPage(cur.j));
          if (!workers.length) { state = 'page'; slice(); }   // the last worker is gone: the page does the rest
        };
        feed(w);
      });
    });
  }
  function mode() { return state === 'ready' ? 'workers (' + workers.length + ')' : state === 'page' ? 'page' : 'starting'; }
  return { run: run, mode: mode, start: start };
};
WL.SimPool = WL.makeSimPool('engine/worker.js');
