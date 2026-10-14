// Builds art/logo.svg: the results table as a logo. Three build rows as bars, and the #1 row on top is a Shadow Bolt
// streaking right (magenta and violet blobs in a purple haze, a bright heart, sparkles, a few green flecks).
// Same family as the in-game addon's logo: 400x400, #15121D filling the square, the page's purples.
// Seeded, so the same picture every run.  node art/make-logo.js [seed] [out.svg]
// PNG: render the SVG at 400x400 in a headless browser (Edge: --headless=new --window-size=400,400 --screenshot=...).
const fs = require('fs'), path = require('path');
let seed = Number(process.argv[2] || 11) >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const f = n => n.toFixed(1);

// The bolt: head H, tail end T; half-width W(t) with t = 0 at the head and 1 at the tail end.
const SCALE = 0.92, H = [316, 128], T = [66, 138];
const L = Math.hypot(T[0] - H[0], T[1] - H[1]);
const d = [(T[0] - H[0]) / L, (T[1] - H[1]) / L], p = [-d[1], d[0]];
const W = t => SCALE * (t < 0.12 ? 50 : 50 * Math.pow(1 - (t - 0.12) / 0.88, 1.5) + 4);
const at = (t, side, along) => [H[0] + d[0] * (L * t + along) + p[0] * side, H[1] + d[1] * (L * t + along) + p[1] * side];
function blobs(n, tPow, spread, rMin, rMax, colors, opacity) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rnd(), tPow), w = W(t);
    const side = (rnd() * 2 - 1) * w * spread;
    const along = t < 0.2 ? (rnd() * 2 - 1) * w * 0.55 : (rnd() * 2 - 1) * 8;
    const [x, y] = at(t, side, along);
    const r = SCALE * (rMin + (rMax - rMin) * rnd() * (0.45 + 0.55 * w / (54 * SCALE)));
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${pick(colors)}" opacity="${opacity}"/>`;
  }
  return s;
}
function mass(k, tMax, color, opacity) { let s = ''; for (let t = 0; t <= tMax; t += 0.01) { const [x, y] = at(t, 0, 0); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(W(t) * k)}" fill="${color}" opacity="${opacity}"/>`; } return s; }
const haze = blobs(30, 1.6, 0.7, 30, 56, ['#5B1A8C', '#7A22B0', '#4A1677'], 0.42);
const massM = mass(0.95, 1, '#9A28D2', 0.06), massC = mass(0.36, 0.2, '#F0E4FF', 0.28);
const magenta = blobs(150, 1.6, 1.0, 3, 11, ['#B02EE0', '#D04CF2', '#9A2AD0', '#E070FF', '#7E3BE0'], 0.85);
const green = blobs(24, 1.4, 0.4, 1.6, 4.5, ['#8EE04A', '#A8F070'], 0.6);
const light = blobs(45, 3, 0.45, 2, 6, ['#F4E6FF', '#FFFFFF', '#FBEFFF'], 0.95);
const sparks = blobs(42, 1.5, 1.35, 1.2, 3.4, ['#FFB4F4', '#FFFFFF', '#F59BFF', '#FFD6FA'], 0.9);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="row2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6A3FB5"/>
      <stop offset="1" stop-color="#A47BEA"/>
    </linearGradient>
    <filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    <filter id="fuzz" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="mass" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="spark" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.6"/></filter>
  </defs>

  <rect width="400" height="400" fill="#15121D"/>

  <!-- build rows 2-4 and the table's edge -->
  <rect x="52" y="186" width="232" height="44" rx="8" fill="url(#row2)"/>
  <rect x="52" y="246" width="190" height="44" rx="8" fill="#5A3D96"/>
  <rect x="52" y="306" width="150" height="44" rx="8" fill="#3A3150"/>
  <rect x="40" y="96" width="6" height="262" rx="3" fill="#2A2438"/>

  <!-- row 1: the shadow bolt -->
  <g filter="url(#haze)">${haze}</g>
  <g filter="url(#mass)">${massM}${massC}</g>
  <g filter="url(#fuzz)">${magenta}</g>
  <g filter="url(#fuzz)">${green}</g>
  <g filter="url(#fuzz)">${light}</g>
  <g filter="url(#spark)">${sparks}</g>
</svg>
`;
fs.writeFileSync(process.argv[3] || path.join(__dirname, 'logo.svg'), svg);
console.log('seed', process.argv[2] || 11, svg.length, 'bytes');
