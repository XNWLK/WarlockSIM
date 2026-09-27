// Minimal in-browser test harness. Results render as a list; summary is in #summary and document.title.
window.T = (function () {
  var results = [], group = '';
  function record(ok, name, detail) { results.push({ ok: ok, group: group, name: name, detail: detail || '' }); }
  return {
    group: function (g) { group = g; },
    ok: function (cond, name, detail) { record(!!cond, name, cond ? '' : detail); },
    eq: function (actual, expected, name) {
      var ok = actual === expected;
      record(ok, name, ok ? '' : 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    },
    near: function (actual, expected, tol, name) {
      var ok = Math.abs(actual - expected) <= tol;
      record(ok, name, ok ? '' : 'expected ' + expected + ' ±' + tol + ', got ' + actual);
    },
    warn: function (name, detail) { results.push({ ok: null, group: group, name: name, detail: detail }); },
    run: function (label, fn) {
      try { fn(); } catch (e) { record(false, label + ' threw', String(e && e.stack || e)); }
    },
    render: function () {
      var pass = results.filter(function (r) { return r.ok === true; }).length;
      var fail = results.filter(function (r) { return r.ok === false; }).length;
      var warn = results.filter(function (r) { return r.ok === null; }).length;
      var sum = 'PASS ' + pass + ' / FAIL ' + fail + ' / WARN ' + warn;
      document.title = sum;
      var html = '<h2 id="summary">' + sum + '</h2>';
      var failures = results.filter(function (r) { return r.ok !== true; });
      if (failures.length) {
        html += '<h3>Failures & warnings</h3><ul>' + failures.map(function (r) {
          return '<li>' + (r.ok === null ? 'WARN' : 'FAIL') + ' [' + r.group + '] ' + r.name + ' — ' + r.detail + '</li>';
        }).join('') + '</ul>';
      }
      html += '<details><summary>All ' + results.length + ' checks</summary><ul>' + results.map(function (r) {
        return '<li>' + (r.ok ? 'ok' : r.ok === null ? 'WARN' : 'FAIL') + ' [' + r.group + '] ' + r.name + '</li>';
      }).join('') + '</ul></details>';
      document.getElementById('out').innerHTML = html;
      window.__TEST_RESULTS = { pass: pass, fail: fail, warn: warn, failures: failures };
    },
  };
})();
