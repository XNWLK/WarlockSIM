// Round 261 tests — the user, 2026-11-26/27:
//   Incinerate Pandemic: "this seems like a better incinerate pandemic build than the old one. replace the old one with this
//   one" → 18/0/33 (−4 Unholy Power, +2 Improved Corruption, +2 Malevolence).
//   Orb of the Darkmoon as Fire Demo's neck ▲: "add it for the upgrade" (it loses −0.96 ± 0.10 DPS, 30 × 1,000 paired fights;
//   the page shows "− 1.0 DPS" and its cost).
//   "check if shadow wrath pants are an upgrade for wrack ds … do the same with shadow demo. shadow wrath pants go up to 40" →
//   Master's Leggings of Shadow Wrath (10252, +40 Shadow, world drop) in place of Leggings of Torment: Wrack DS +0.02 ± 0.07,
//   Shadow Demo −0.22 ± 0.14 (Max lists: +0.11 ± 0.05 / −0.56 ± 0.17) — a tie, no ▲ (it needs > 0.5 DPS and > 2 SE).
//   "check inferno gloves for fire demo and incinerate builds" → Inferno Gloves (18408) lose to Hands of Power: Fire Demo
//   −0.58 ± 0.05, Incinerate Pandemic −1.97 ± 0.10, Incinerate DS −1.02 ± 0.09; on the Max lists −3.1 … −6.4. On no list.
(function () {
  var MASTERS = 10252, TORMENT = 22342, INFERNO = 18408, HOP = 13253, ORB = 19426, NACREOUS = 22403;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }

  T.run('round 261: Incinerate Pandemic talents 18/0/33', function () {
    var b = WL.BUILDS.filter(function (x) { return x.key === 'destro_incin_succ'; })[0], t = b.talents, tree = {};
    Object.keys(t).forEach(function (k) { var tr = WL.TALENT_BY_KEY[k].tree; tree[tr] = (tree[tr] || 0) + t[k]; });
    T.eq((tree.affliction || 0) + '/' + (tree.demonology || 0) + '/' + (tree.destruction || 0), '18/0/33', 'points per tree 18/0/33');
    T.eq(Object.keys(t).reduce(function (s, k) { return s + t[k]; }, 0), 51, '51 points');
    T.ok(!t.unholyPower, 'no Unholy Power (was 4)');
    T.eq(t.improvedCorruption, 5, 'Improved Corruption 5/5 (was 3)');
    T.eq(t.malevolence, 2, 'Malevolence 2 (new)');
    T.ok(t.suppression === 5 && t.pandemic === 3 && t.improvedLifeTap === 2 && t.amplifyCurse === 1, 'the rest of Affliction unchanged');
    T.ok(t.shadowAndFlame === 5 && t.incinerate === 1 && t.conflagrate === 1 && t.ruin === 5, 'Destruction unchanged');
    T.ok(/^18\/0\/33\./.test(b.notes) && !/Unholy Power/.test(b.notes), 'the build notes say 18/0/33, no Unholy Power');
    T.eq(WL.validateBuild(b).join(' | '), '', 'a legal build');
    T.eq(WL.decodeBuild(WL.encodeBuild(b)).talents.malevolence, 2, 'survives a build code round trip');
  });

  T.run('round 261: Master\'s Leggings of Shadow Wrath', function () {
    var it = WL.ITEMS[MASTERS];
    T.ok(it && it.name === "Master's Leggings of Shadow Wrath", 'item 10252 kept as its Shadow Wrath roll');
    T.ok(it && it.slot === 'legs' && it.quality === 'uncommon' && it.ilvl === 64 && it.req === 59, 'green cloth legs, item level 64, Requires Level 59');
    T.eq(JSON.stringify(it && it.stats), JSON.stringify({ shadowSp: 40 }), '+40 Shadow damage only (user: "go up to 40")');
    T.ok(it && it.from === 'World drop' && !it.raid && (it.phase || 1) === 1, 'a Phase 1 world drop, not from a raid');
    var tip = (WL.ITEM_TIPS || {})[MASTERS];
    if (WL.ITEM_TIPS) T.ok(tip && /Master's Leggings of Shadow Wrath/.test(tip) && /\+40 Shadow Spell Damage/.test(tip) && /72 Armor/.test(tip), 'its tooltip (72 Armor, +40 Shadow Spell Damage)');
    var P = WL.PRE_RAID_BIS, M = WL.MAX_PRE_RAID_BIS;
    T.ok(P.wrack_ds.legs === TORMENT && P.demo_pact_succ_sb.legs === TORMENT, 'Realistic: Wrack DS / Shadow Demo keep Leggings of Torment (Shadow Wrath legs +0.02 ± 0.07 / −0.22 ± 0.14: a tie)');
    T.ok(M.wrack_ds.legs === TORMENT && M.demo_pact_succ_sb.legs === TORMENT, 'Max: the same (+0.11 ± 0.05 / −0.56 ± 0.17)');
    T.ok(Object.keys(P).every(function (k) { return P[k].legs !== MASTERS && M[k].legs !== MASTERS; }), 'on no list');
  });

  T.run('round 261: Inferno Gloves', function () {
    var it = WL.ITEMS[INFERNO];
    T.ok(it && it.name === 'Inferno Gloves' && it.src === 'crafted' && it.stats.fireSp === 33 && it.stats.int === 9, 'Inferno Gloves: crafted, +33 Fire, +9 Int');
    var P = WL.PRE_RAID_BIS, M = WL.MAX_PRE_RAID_BIS;
    T.ok(['demo_pact_fire', 'destro_incin_succ', 'destro_incin_ds'].every(function (k) { return P[k].hands === HOP; }), 'Realistic: Hands of Power stays (Inferno −0.58 / −1.97 / −1.02)');
    T.ok(M.demo_pact_fire.hands === 226911 && M.destro_incin_succ.hands === 14146 && M.destro_incin_ds.hands === 226911, 'Max: Deathmist Wraps / Gloves of Spell Mastery / Deathmist Wraps stay (Inferno −3.1 / −6.4 / −4.0)');
    T.ok(Object.keys(P).every(function (k) { return P[k].hands !== INFERNO && M[k].hands !== INFERNO; }), 'on no list');
  });

  T.run('round 261: the pre-raid page (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json'), aj = src('../private/bis-page/alts.js'), tp = src('../private/bis-page/template.html');
    if (!nt || !dj || !aj || !tp) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports, D = JSON.parse(dj);
    T.ok(!(N.UP_BUILD.demo_pact_fire && N.UP_BUILD.demo_pact_fire.neck === ORB), 'notes.js: Fire Demo\'s ▲ neck pin Orb of the Darkmoon is out again (round 264, user: "since it\'s not an actual dps upgrade, remove it")');
    T.ok(N.UP_TRY && N.UP_TRY[MASTERS] && N.UP_TRY[INFERNO], 'notes.js UP_TRY: the Shadow Wrath legs and Inferno Gloves are measured for the ▲');
    T.eq((N.NOTE[MASTERS] || []).join(), 'Expensive', 'the Shadow Wrath legs\' downside: Expensive (user)');
    T.ok(/kept: the page shows the loss/.test(aj) && !/WARNING ▲[^\n]*process\.exit/.test(aj), 'alts.js: a losing hand-picked ▲ is only a warning');
    var fd = D.builds.filter(function (b) { return b.key === 'demo_pact_fire'; })[0], neck = fd && fd.alts.neck;
    T.ok(fd && fd.slots.neck === NACREOUS, 'Fire Demo\'s main neck: Nacreous Shell Necklace');
    T.ok(neck && !(neck.up && neck.up.id === ORB), 'Fire Demo\'s neck ▲ is no longer Orb of the Darkmoon (round 264)');
    T.ok(/x\.dps > 0 \? pm\(\[f1\(x\.dps\) \+ ' DPS'\], m\) : pm\(\[\], \[f1\(Math\.abs\(x\.dps\)\) \+ ' DPS'\]/.test(tp), 'the template shows a loss as "− x DPS"');
    T.ok(/picked by hand and show their DPS change as measured, a loss too/.test(tp), 'the notes say a hand pick can show a loss');
    var bad = [];
    D.builds.forEach(function (b) { Object.keys(b.alts).forEach(function (s) { var a = b.alts[s];
      if (a.alt && a.alt.dps > 0 && !a.alt.tie) bad.push(b.key + ' ' + s + ' ▼ ' + WL.ITEMS[a.alt.id].name + ' +' + a.alt.dps);
      // round 262 (user: "if shadow wrath is better than torment, use them as upgrade"): Wrack DS's legs ▲ is the Shadow Wrath legs by hand
      if (a.up && ((a.up.id === MASTERS && !(b.key === 'wrack_ds' && s === 'legs')) || a.up.id === INFERNO)) bad.push(b.key + ' ' + s + ' ▲ ' + WL.ITEMS[a.up.id].name);
      if (a.alt && a.alt.id === INFERNO) bad.push(b.key + ' ' + s + ' ▼ Inferno Gloves (crafted)');
    }); });
    T.eq(bad.join('; '), '', 'no ▼ beats its main; Inferno Gloves are not shown, the Shadow Wrath legs not as a ▲ by rule (round 262: Wrack DS ▲ / Shadow Demo ▼ by hand)');
    var ip = D.builds.filter(function (b) { return b.key === 'destro_incin_succ'; })[0];
    T.ok(ip && Object.keys(ip.alts).length >= 15, 'Incinerate Pandemic: every slot rerun (' + (ip ? Object.keys(ip.alts).length : 0) + ' slots)');
  });
})();
