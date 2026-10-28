// One command for the Wowhead Forever item sync (round 166, user: "think of a way to streamline this syncing").
//   node tools/items-sync.js         prints the snippet and waits (on 127.0.0.1:8799, for up to 60 minutes)
// 1. Paste the printed snippet into the browser console of any www.wowhead.com/forever page and wait (10–20 minutes; it
//    pauses between requests and waits when Wowhead refuses one).
// 2. When it is done the tab jumps to this receiver with the packed data; this script writes
//    research/raw/forever-items.json, runs tools/gen-items.js (data/item-db.js and the list of new / gone / changed items
//    and enchants) and shows that list in the tab and here. Then it stops.
// 3. New item icons: powershell -ExecutionPolicy Bypass -File tools\\gen-item-icons.ps1 (downloads only icons not yet there).
// The data travels in the address of one page jump (a Wowhead tab cannot post to 127.0.0.1, popups are blocked), so this
// restarts itself with a large header limit.
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), cp = require('child_process');
if (!process.execArgv.some(a => /max-http-header-size/.test(a))) {
  const r = cp.spawnSync(process.execPath, ['--max-http-header-size=8000000', __filename].concat(process.argv.slice(2)), { stdio: 'inherit' });
  process.exit(r.status || 0);
}
const ROOT = path.join(__dirname, '..'), RAW = path.join(ROOT, 'research', 'raw'), OUT = path.join(RAW, 'forever-items.json');
const { COLLECT } = require('./items-collect.js');
const parts = {};
console.log('Paste this into the console of a www.wowhead.com/forever tab:\n\n' + COLLECT + '\n\nWaiting on http://127.0.0.1:8799 …');
const page = (res, body) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><meta charset="utf-8"><title>Item sync</title><body style="font:14px system-ui;max-width:900px;margin:24px auto;white-space:pre-wrap">' + body.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</body>'); };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname !== '/save') { res.writeHead(404); return res.end('no'); }
  const part = +u.searchParams.get('part'), of = +u.searchParams.get('of'), z = u.searchParams.get('z') || '';
  if (!(part >= 0 && of > part) || !z) { res.writeHead(400); return res.end('no'); }
  parts[part] = z;
  if (Object.keys(parts).length < of) { console.log('part ' + (part + 1) + ' of ' + of); return page(res, 'Part ' + (part + 1) + ' of ' + of + ' received. Go back and paste the next SEND.'); }
  let o;
  try { o = JSON.parse(zlib.gunzipSync(Buffer.from(Array.from({ length: of }, (_, i) => parts[i]).join(''), 'base64url')).toString('utf8')); }
  catch (e) { console.log('the data does not unpack: ' + e.message); return page(res, 'The data does not unpack: ' + e.message + '. Run the snippet again.'); }
  if (!o || !Array.isArray(o.items) || o.items.length < 1000 || !(o.enchants || []).length) {   // a run in the wrong tab, or Wowhead refused: keep the old data
    console.log("too little data (" + ((o && o.items) || []).length + " items): nothing written"); return page(res, "Too little data (" + ((o && o.items) || []).length + " items, " + ((o && o.enchants) || []).length + " enchants): nothing written. Run the snippet again in a www.wowhead.com/forever tab.");
  }
  fs.writeFileSync(OUT, JSON.stringify(o));
  let report = 'research/raw/forever-items.json: ' + o.items.length + ' items, ' + o.enchants.length + ' enchants (collected ' + o.collected + ')\n\n';
  const g = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools', 'gen-items.js')], { encoding: 'utf8' });
  report += (g.stdout || '') + (g.stderr || '');
  report += '\nNext: new item icons — powershell -ExecutionPolicy Bypass -File tools\\gen-item-icons.ps1; then the tests (tests/index.html).\n' +
    'In the Wowhead tab: localStorage.removeItem("__wlx"); localStorage.removeItem("__wlx_cache") frees its storage.';
  console.log('\n' + report); page(res, report);
  setTimeout(() => process.exit(0), 500);
});
srv.listen(8799, '127.0.0.1');
setTimeout(() => { console.log('no data after 60 minutes: stopped'); process.exit(1); }, 60 * 60 * 1000);
