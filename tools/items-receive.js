// Local receiver for tools/items-collect.js: a wowhead.com tab hands over the collected item data part by part
// (GET http://127.0.0.1:8799/save?name=forever-items.json&part=<i>&of=<n>&d=<data>). Each part goes to
// research/raw/forever-items.json.part<i>; when all <n> parts are there they are joined into research/raw/forever-items.json
// and the parts are deleted. Listens on 127.0.0.1 only and stops after 30 minutes.
// Usage: node --max-http-header-size=4000000 tools/items-receive.js   (the parts travel in the address, so it must be long)
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'research', 'raw');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), name = (u.searchParams.get('name') || '').replace(/[^a-z0-9_.-]/gi, '');
  if (req.method !== 'GET' || u.pathname !== '/save' || name !== 'forever-items.json') { res.writeHead(400); return res.end('no'); }
  const part = +u.searchParams.get('part'), of = +u.searchParams.get('of'), d = u.searchParams.get('d') || '';
  if (!(part >= 0 && of > part)) { res.writeHead(400); return res.end('no'); }
  fs.writeFileSync(path.join(DIR, name + '.part' + part), d);
  let msg = 'part ' + (part + 1) + ' of ' + of + ' saved (' + d.length + ' characters)';
  const parts = []; for (let i = 0; i < of; i++) parts.push(path.join(DIR, name + '.part' + i));
  if (parts.every(p => fs.existsSync(p))) {
    const txt = parts.map(p => fs.readFileSync(p, 'utf8')).join('');
    let o = null; try { o = JSON.parse(txt); } catch (e) { msg += ' — all parts there, but they do not join into valid data (' + e.message + '); the parts are kept'; }
    if (o) { fs.writeFileSync(path.join(DIR, name), txt); parts.forEach(p => fs.unlinkSync(p)); msg += ' — all parts there: research/raw/' + name + ' written, ' + o.items.length + ' items'; }
  }
  console.log(msg);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<p>' + msg + '</p>');
}).listen(8799, '127.0.0.1', () => console.log('listening on http://127.0.0.1:8799'));
setTimeout(() => process.exit(0), 30 * 60 * 1000);
