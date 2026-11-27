// Round 262 tests — the user, 2026-11-27, after the round-261 talent search ("1. yes 2. both"):
//   Fire Demo: −2 Demonic Embrace +1 Demonic Brand +1 Demonic Energies and −3 Aftermath +3 Cataclysm (2/31/18 as before).
//   Incinerate DS: −1 Aftermath −1 Improved Corruption +2 Improved Life Tap (7/11/33 → 8/11/32).
//   Master's Leggings of Shadow Wrath (10252): "if shadow wrath is better than torment, use them as upgrade. if they're worse,
//   use them as alternative" — 100 × 1,000 paired fights vs Leggings of Torment:
//   Wrack DS +0.08 ± 0.04 (better) → its legs ▲ by hand (notes.js UP_BUILD; within the noise, so the page shows "≈ About the
//   same" with "Expensive"); Shadow Demo −0.21 ± 0.06 (worse) → its legs ▼ by hand (notes.js ALT_BUILD, new: ALT is keyed by
//   the main item and Torment → Skyshroud is shared), in place of Skyshroud Leggings; Wrack DS keeps Skyshroud as its ▼.
//   The user, same day: "add a "what changed" section at the top of the bis list, detailing what the latest update was so ppl
//   aren't surprised why some things are difference" → notes.js CHANGES → data.json changes → a box under the lede.
(function () {
  var MASTERS = 10252, TORMENT = 22342, SKYSHROUD = 13170;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function split(b) { var s = { affliction: 0, demonology: 0, destruction: 0 }; Object.keys(b.talents).forEach(function (t) { s[WL.TALENT_BY_KEY[t].tree] += b.talents[t]; }); return s.affliction + '/' + s.demonology + '/' + s.destruction; }
  function sum(b) { return Object.keys(b.talents).reduce(function (s, k) { return s + b.talents[k]; }, 0); }

  T.run('round 262: Fire Demo talents', function () {
    T.group('round 262: Fire Demo talents');
    var b = WL.findBuild('demo_pact_fire'), t = b.talents;
    T.eq(split(b), '2/31/18', 'points per tree 2/31/18');
    T.eq(sum(b), 51, '51 points');
    T.eq(t.demonicEmbrace, 2, 'Demonic Embrace 2 (was 4)');
    T.eq(t.demonicBrand, 3, 'Demonic Brand 3/3 (was 2)');
    T.eq(t.demonicEnergies, 2, 'Demonic Energies 2/2 (was 1)');
    T.eq(t.aftermath, 2, 'Aftermath 2 (was 5)');
    T.eq(t.cataclysm, 3, 'Cataclysm 3/3 (new)');
    T.ok(t.unholyPower === 5 && t.improvedImp === 3 && t.masterDemonologist === 5 && t.demonicPact === 1 && t.ruin === 5 && t.agonizingFlames === 3 && t.bane === 5, 'the rest unchanged');
    T.ok(/^2\/31\/18\./.test(b.notes) && /Cataclysm/.test(b.notes), 'the build notes say 2/31/18 and name Cataclysm');
    T.eq(WL.validateBuild(b).join(' | '), '', 'a legal build');
    var d = WL.decodeBuild(WL.encodeBuild(b)).talents;
    T.ok(d.cataclysm === 3 && d.aftermath === 2 && d.demonicBrand === 3, 'survives a build code round trip');
  });

  T.run('round 262: Incinerate DS talents', function () {
    T.group('round 262: Incinerate DS talents');
    var b = WL.findBuild('destro_incin_ds'), t = b.talents;
    T.eq(split(b), '8/11/32', 'points per tree 8/11/32 (was 7/11/33)');
    T.eq(sum(b), 51, '51 points');
    T.eq(t.improvedLifeTap, 2, 'Improved Life Tap 2/2 (new)');
    T.eq(t.improvedCorruption, 1, 'Improved Corruption 1 (was 2)');
    T.eq(t.aftermath, 4, 'Aftermath 4 (was 5)');
    T.ok(t.suppression === 5 && t.demonicEmbrace === 5 && t.demonicSacrifice === 1 && t.shadowAndFlame === 5 && t.incinerate === 1 && t.conflagrate === 1 && t.shadowburn === 1, 'the rest unchanged');
    T.ok(/^8\/11\/32\./.test(b.notes) && /Improved Life Tap/.test(b.notes), 'the build notes say 8/11/32 and name Improved Life Tap');
    T.eq(WL.validateBuild(b).join(' | '), '', 'a legal build');
    var d = WL.decodeBuild(WL.encodeBuild(b)).talents;
    T.ok(d.improvedLifeTap === 2 && d.aftermath === 4 && d.improvedCorruption === 1, 'survives a build code round trip');
  });

  T.run('round 262: Master\'s Leggings of Shadow Wrath on the pre-raid page (private/bis-page, local only)', function () {
    T.group('round 262: Shadow Wrath legs on the pre-raid page');
    var P = WL.PRE_RAID_BIS;
    T.ok(P.wrack_ds.legs === TORMENT && P.demo_pact_succ_sb.legs === TORMENT, 'the legs main stays Leggings of Torment (Wrack DS, Shadow Demo)');
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json'), aj = src('../private/bis-page/alts.js'), tp = src('../private/bis-page/template.html');
    if (!nt || !dj || !aj || !tp) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports, D = JSON.parse(dj), B = {};
    D.builds.forEach(function (b) { B[b.key] = b; });
    T.eq((N.NOTE[MASTERS] || []).join(), 'Expensive', 'notes.js: its downside is "Expensive" (user)');
    T.ok(N.UP_BUILD.wrack_ds && N.UP_BUILD.wrack_ds.legs === MASTERS, 'notes.js UP_BUILD: Wrack DS legs ▲ Master\'s Leggings of Shadow Wrath (+0.08 ± 0.04)');
    T.ok(N.ALT_BUILD && N.ALT_BUILD.demo_pact_succ_sb && N.ALT_BUILD.demo_pact_succ_sb.legs === MASTERS, 'notes.js ALT_BUILD: Shadow Demo legs ▼ Master\'s Leggings of Shadow Wrath (−0.21 ± 0.06)');
    T.eq(N.ALT[TORMENT], SKYSHROUD, 'ALT Torment → Skyshroud stays (Wrack DS\'s ▼)');
    T.ok(/ALT_BUILD = \{\} \} = require\('\.\/notes\.js'\)/.test(aj) && /const low = ab \? \{ id: ab \} : ALT\[slots\[slot\]\]/.test(aj), 'alts.js: a per-build ▼ pick (ALT_BUILD) comes before ALT');
    var wl = B.wrack_ds && B.wrack_ds.alts.legs, sl = B.demo_pact_succ_sb && B.demo_pact_succ_sb.alts.legs;
    T.ok(wl && wl.up && wl.up.id === MASTERS, 'page: Wrack DS legs ▲ is the Shadow Wrath legs');
    T.ok(wl && wl.up && (wl.up.minus || []).indexOf('Expensive') >= 0, 'with its downside "Expensive"');
    T.ok(wl && wl.up && (wl.up.tie || wl.up.dps > 0), 'shown as a tie or a gain (' + (wl && wl.up && (wl.up.tie ? 'tie' : wl.up.dps)) + ')');
    T.ok(wl && wl.alt && wl.alt.id === SKYSHROUD, 'Wrack DS legs ▼ stays Skyshroud Leggings');
    T.ok(sl && sl.alt && sl.alt.id === MASTERS, 'page: Shadow Demo legs ▼ is the Shadow Wrath legs (was Skyshroud Leggings)');
    T.ok(sl && sl.alt && (sl.alt.minus || []).indexOf('Expensive') >= 0, 'with its downside "Expensive"');
    T.ok(sl && (!sl.up || sl.up.id !== MASTERS), 'Shadow Demo: not also its ▲');
    T.ok(/var m = x\.minus \|\| \[\]/.test(tp) && /dpsPm\(alt\)/.test(tp) && /dpsPm\(up\)/.test(tp), 'the template shows the downside on the ▲ and the ▼ line');
    T.group('What changed');
    T.ok(N.CHANGES && /^\d{4}-\d\d-\d\d$/.test(N.CHANGES.date) && N.CHANGES.items.length >= 1 && N.CHANGES.items.length <= 8, 'notes.js CHANGES: a date and 1–8 lines');
    T.eq(N.CHANGES && N.CHANGES.date, '2026-11-27', 'its date: 2026-11-27 (round 262)');
    T.ok(D.changes && D.changes.date === N.CHANGES.date && D.changes.items.join('|') === N.CHANGES.items.join('|'), 'data.json carries it');
    T.ok(N.CHANGES && N.CHANGES.items.some(function (x) { return /Shadow Wrath/.test(x); }) && !N.CHANGES.items.some(function (x) { return /talent|\d+\/\d+\/\d+|Cataclysm|Malevolence/i.test(x); }), 'it names the Shadow Wrath legs, and gear only: no talent lines (round 267, user: "we only need to have stuff related to gear")');
    T.ok(/<section class="changes" id="changes"/.test(tp) && /What changed<time datetime=/.test(tp) && /\.changes \{/.test(tp), 'the template has the box, its heading with the date, and its style');
    var gh = src('../private/bis-page/github/index.html'), art = src('../private/bis-page/pre-raid-bis.html');
    T.ok(gh.indexOf('"changes":{"date":"2026-11-27"') >= 0 && art.indexOf('"changes":{"date":"2026-11-27"') >= 0, 'both builds (artifact, GitHub) carry it');
    T.group('round 262: the pre-raid page');
    var SW = function (id) { return !!(WL.ITEMS[id] && / of Shadow Wrath$/.test(WL.ITEMS[id].name)); }, bad = [];
    D.builds.forEach(function (b) { Object.keys(b.alts).forEach(function (s) { var a = b.alts[s];
      if ([b.slots[s], a.up && a.up.id, a.alt && a.alt.id].filter(SW).length > 1) bad.push(b.key + ' ' + s); }); });
    T.eq(bad.join(', '), '', 'still one Shadow Wrath item per slot among main / ▲ / ▼');
    if (typeof document.createElement === 'function' && gh) T.async('round 262: the "What changed" box renders (GitHub page in a frame)', function (done) {
      var fr = document.createElement('iframe'); fr.style.cssText = 'position:absolute;left:-9999px;width:375px;height:800px'; fr.setAttribute('aria-hidden', 'true');
      fr.onload = function () { try { var d = fr.contentDocument, el = d.getElementById('changes');
        T.ok(el && !el.hidden, 'the box is shown');
        T.ok(el && /What changed/.test(el.textContent) && el.querySelector('time') && el.querySelector('time').getAttribute('datetime') === '2026-11-27', 'heading "What changed" with the date 2026-11-27');
        T.ok(el && /27 November 2026/.test(el.querySelector('time').textContent), 'the date reads "27 November 2026"');
        T.eq(el ? el.querySelectorAll('li').length : 0, N.CHANGES.items.length, 'one line per change');
        T.ok(el && el.scrollWidth <= el.clientWidth + 1 && d.documentElement.scrollWidth <= fr.clientWidth + 1, 'no sideways scroll at 375 px');
      } catch (e) { T.ok(false, 'the frame could not be read', String(e)); } fr.remove(); done(); };
      fr.srcdoc = gh; document.body.appendChild(fr);
    });
    T.ok(B.demo_pact_fire && Object.keys(B.demo_pact_fire.alts).length >= 15 && B.destro_incin_ds && Object.keys(B.destro_incin_ds.alts).length >= 15, 'Fire Demo and Incinerate DS: every slot rerun');
  });
})();
