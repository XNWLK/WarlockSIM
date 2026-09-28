// Headless test runner (round 58, Linux / cloud sessions; replaces opening tests/ in a browser by hand).
// Usage:  python3 -m http.server 8765 &   (from the project root)
//         NODE_PATH=$(npm root -g) node tools/run-tests.js [url]
// Prints the page's summary line (PASS / FAIL / WARN), every failing check, and console errors; exit code 1 on FAIL > 0.
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8765/tests/';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const t0 = Date.now();
  await page.goto(url);
  // tests run synchronously on load; T.render() replaces "running…" and sets the title
  await page.waitForFunction(() => !!window.__TEST_RESULTS, null, { timeout: 600000 });
  const r = await page.evaluate(() => window.__TEST_RESULTS);
  console.log('PASS ' + r.pass + ' / FAIL ' + r.fail + ' / WARN ' + r.warn + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  r.failures.forEach(f => console.log('  ' + (f.ok === null ? 'WARN' : 'FAIL') + ' [' + f.group + '] ' + f.name + ' — ' + f.detail));
  errors.forEach(e => console.log('  ' + e));
  await browser.close();
  process.exit(r.fail === 0 ? 0 : 1);
})();
