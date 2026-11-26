// Round 259 tests — the user, 2026-11-26: "in the bis list for incinerate DS it lists elemental mage staff as bis but the
// alternative is staff of sorrow and that one is a dps increase. why isn't it listed as bis then? same with legs. deathmist is
// the alternative but it's better. for incinerate pandemic band of wizardry is listed as alternative but it's an upgrade so it
// should be listed in the upgrade section. the songstone has don mauricio as an alternative but it's better than songstone.
// shadow demo has the same problem. list in the top that these sims are done for a 3 minute fight also. also consider
// highlander's cloth girdle".
// Paired fights (30 × 1,000, the close ones 100 × 1,000, page defaults) on the Realistic lists:
//   rings: Songstone of Ironforge was the weakest blue ring in four builds → Shadow Demo Don Mauricio's + Channeler's (+1.53 ±
//   0.09), Fire Demo Maiden's Circle + Channeler's (+0.38 ± 0.04), Incinerate Pandemic Maiden's Circle + Channeler's (+0.62 ±
//   0.04; Don Mauricio's +0.32 ± 0.05), Wrack DS Channeler's + Don Mauricio's (+0.80 ± 0.05); Incinerate DS keeps Songstone.
//   Incinerate DS legs Deathmist Leggings (+0.31 ± 0.07 over Skyshroud); its staff stays Elemental Mage Staff (Staff of Sorrow
//   −0.35 ± 0.06: the page's "+0.1" was noise).
//   Defiler's Cloth Girdle (the Horde twin of Highlander's Cloth Girdle, the same stats; Arathi Basin reputation) loses to every
//   main waist (−0.7 … −3.1) → on no list and not on the page (reputation: no ▼; it beats nothing: no ▲).
// The page: ▲ / ▼ numbers from 20 paired chunks × 1,000 fights with a standard error; a ▲ by rule needs > 0.5 and > 2 se; a
// ▲ / ▼ within max(0.3, 2 se) shows "About the same DPS" (no sign); Rune Band of Wizardry is only ever a ▲ (notes.js UP_ONLY);
// Fire Demo's ▲ pin Orb of the Darkmoon is out (−0.95 ± 0.10); the lede says "3-minute fight".
(function () {
  var SONG = 12543, DON = 22433, MAIDEN = 13001, CHAN = 272406, RUNE = 22339, DEATHMIST = 226910, SKY = 13170, EMS = 944, SORROW = 280082;
  var HIGHLANDER = 20047, DEFILER = 20163, ORB = 19426;
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }

  T.run('round 259: the Realistic lists (rings, Incinerate DS legs)', function () {
    var P = WL.PRE_RAID_BIS;
    var want = { demo_pact_succ_sb: [DON, CHAN], demo_pact_fire: [MAIDEN, CHAN], destro_incin_succ: [MAIDEN, CHAN], destro_incin_ds: [SONG, CHAN], wrack_ds: [CHAN, DON] };
    Object.keys(want).forEach(function (k) {
      T.ok(P[k].finger1 === want[k][0] && P[k].finger2 === want[k][1], k + ': ' + WL.ITEMS[want[k][0]].name + ' + ' + WL.ITEMS[want[k][1]].name);
    });
    T.eq(P.destro_incin_ds.legs, DEATHMIST, 'Incinerate DS: Deathmist Leggings (was Skyshroud Leggings)');
    T.ok(['demo_pact_fire', 'destro_incin_succ'].every(function (k) { return P[k].legs === SKY; }), 'Fire Demo / Incinerate Pandemic keep Skyshroud Leggings (Deathmist −0.67 / −0.77)');
    T.eq(P.destro_incin_ds.mainHand, EMS, 'Incinerate DS keeps Elemental Mage Staff (Staff of Sorrow −0.35 ± 0.06)');
    T.ok(Object.keys(P).every(function (k) { return [P[k].finger1, P[k].finger2].every(function (r) { return WL.ITEMS[r].quality === 'rare'; }) && P[k].finger1 !== P[k].finger2; }), 'every ring blue, two different rings');
    T.ok(Object.keys(P).every(function (k) { var g = { slots: {} }; Object.keys(P[k]).forEach(function (s) { g.slots[s] = { id: P[k][s] }; }); return !WL.gearUniqueOver(g).length; }), 'no unique-equipped rule broken');
    T.ok(Object.keys(P).every(function (k) { return P[k].finger1 !== RUNE && P[k].finger2 !== RUNE; }), 'Rune Band of Wizardry stays an upgrade (on no Realistic list)');
    T.eq(WL.ITEMS[DEATHMIST].quality, 'rare', 'Deathmist Leggings are blue (the Realistic lists stay all-blue)');
    var G = WL.PRE_BIS_GEAR;
    Object.keys(want).forEach(function (k) { T.ok(G[k].slots.finger1 === P[k].finger1 && G[k].slots.finger2 === P[k].finger2 && G[k].slots.legs === P[k].legs, 'generated Pre-BiS gear ' + k + ': the same rings and legs'); });
  });

  T.run('round 259: Highlander\'s / Defiler\'s Cloth Girdle', function () {
    var h = WL.ITEMS[HIGHLANDER], d = WL.ITEMS[DEFILER];
    T.ok(h && h.name === "Highlander's Cloth Girdle" && h.slot === 'waist' && h.quality === 'rare', 'item 20047: Highlander\'s Cloth Girdle, blue waist');
    T.ok(d && d.name === "Defiler's Cloth Girdle", 'item 20163: Defiler\'s Cloth Girdle (its Horde twin)');
    T.eq(JSON.stringify(h.stats), JSON.stringify(d.stats), 'the same stats (14 spell power, 1% crit, 6 Int, 7 Sta)');
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return WL.PRE_RAID_BIS[k].waist !== DEFILER && WL.PRE_RAID_BIS[k].waist !== HIGHLANDER && WL.MAX_PRE_RAID_BIS[k].waist !== DEFILER; }), 'on no list (loses to Ban\'thok Sash / Master\'s Belt of Shadow Wrath by 0.7 … 3.1 DPS, to Belt of the Archmage by more)');
  });

  T.run('round 259: the pre-raid page (private/bis-page, local only)', function () {
    var nt = src('../private/bis-page/notes.js'), dj = src('../private/bis-page/data.json'), tp = src('../private/bis-page/template.html'), aj = src('../private/bis-page/alts.js');
    if (!nt || !dj || !tp || !aj) { T.warn('private/bis-page not readable here (not in the repository, or file://)'); return; }
    var mod = { exports: {} }; new Function('module', nt)(mod);
    var N = mod.exports, D = JSON.parse(dj);
    T.ok(N.UP_ONLY && N.UP_ONLY[RUNE], 'notes.js: Rune Band of Wizardry is UP_ONLY (user: "it\'s an upgrade")');
    T.ok(!(N.UP_BUILD.demo_pact_fire && N.UP_BUILD.demo_pact_fire.neck === ORB), 'notes.js: Fire Demo\'s ▲ pin Orb of the Darkmoon is out (it loses: −0.95 ± 0.10)');
    T.ok(N.ALT[EMS] === SORROW, 'Elemental Mage Staff\'s ▼ is still Staff of Sorrow (round 251\'s "whatever comes next")');
    T.ok(D.altSeeds >= 20 && D.altFights === 1000, '▲ / ▼ numbers: ' + D.altSeeds + ' paired chunks × ' + D.altFights + ' fights (was 2 × 2,000)');
    var bad = [], runeAlt = [], ties = 0;
    D.builds.forEach(function (b) { Object.keys(b.alts).forEach(function (s) { var a = b.alts[s];
      if (a.alt && a.alt.dps > 0 && !a.alt.tie) bad.push(b.key + ' ' + s + ' ▼ ' + WL.ITEMS[a.alt.id].name + ' +' + a.alt.dps);
      if (a.up && !(a.up.dps > 0)) bad.push(b.key + ' ' + s + ' ▲ ' + WL.ITEMS[a.up.id].name + ' ' + a.up.dps);
      if (a.up && a.up.tie && !(a.up.dps > 0)) bad.push(b.key + ' ' + s + ' ▲ tie below 0');
      if (a.alt && a.alt.id === RUNE) runeAlt.push(b.key + ' ' + s);
      if (a.alt && a.alt.tie) ties++;
      [a.up, a.alt].forEach(function (x) { if (x && (x.id === DEFILER || x.id === HIGHLANDER)) bad.push(b.key + ' ' + s + ' cloth girdle shown'); });
    }); });
    T.eq(bad.join('; '), '', 'no ▼ beats the main beyond the noise, every ▲ gains, the cloth girdle is not shown');
    T.eq(runeAlt.join(', '), '', 'Rune Band of Wizardry is never a ▼');
    T.ok(ties >= 0, ties + ' ▼ shown as "About the same DPS"');
    var ids = D.builds.filter(function (b) { return b.key === 'destro_incin_succ'; })[0];
    T.ok(ids && ids.alts.finger1.up && ids.alts.finger1.up.id === RUNE, 'Incinerate Pandemic: Rune Band of Wizardry is the ▲ of the top ring slot');
    T.ok(/3-minute fight/.test(tp) && /var LEDE = '[^']*3-minute fight/.test(tp), 'the lede says the sims are a 3-minute fight (user)');
    T.ok(/function dpsPm/.test(tp) && /About the same DPS/.test(tp) && !/pm\(\[f1\(up\.dps\)/.test(tp), 'the template: a tie shows "About the same DPS", a ▲ never "+ −x"');
    T.ok(/Math\.max\(0\.3, 2 \* se\)/.test(aj) && /r\.d > 0\.5 && r\.d > 2 \* r\.se/.test(aj), 'alts.js: tie = within max(0.3, 2 se); a ▲ by rule > 0.5 and > 2 se');
  });
})();
