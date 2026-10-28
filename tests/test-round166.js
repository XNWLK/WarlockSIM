// Round 166 tests (user: to-do items 1–15): Dark Inspiration, the enchant list for Warlocks only, Destro Incinerate Imp off
// the sheet, cheat mode, Wowhead talent links, conditions on built-in actions, trinkets, the fight-length table.
(function () {
  function det(f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.fight.durationVarPct = 0; c.combat.levelResist.on = false;
    if (f) f(c);
    return c;
  }
  function tb(rot, t, pet) { return { key: 't166', short: 't', name: 't', notes: '', talents: t || {}, pet: pet || null, sacrifice: null, oil: 'none', rotation: rot }; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.filter(function (b) { return b.key === k; })[0])); }
  function wear(c, ids) { c.gearBuilder = { on: true, slots: { trinket1: ids[0] ? { id: ids[0] } : null, trinket2: ids[1] ? { id: ids[1] } : null }, manual: {}, enchants: {} }; return c; }

  T.run('round 166: Dark Inspiration, Warlock-only enchants, five builds', function () {
    T.group('Dark Inspiration (Shadow Priest): +15% Spirit, multiplies with Kings and The Human Spirit');
    var di = WL.DEFAULT_CONFIG.buffs.darkInspiration;
    T.ok(di && di.id === 1326168 && di.spiPct === 15 && !di.on, 'a raid buff, 15%, off by default');
    var b = tb(['shadowBolt']), s0 = WL.computeStats(b, 'human', det()), s1 = WL.computeStats(b, 'human', det(function (c) { c.buffs.darkInspiration.on = true; }));
    T.near(s1.spi / s0.spi, 1.15, 1e-9, 'Spirit × 1.15 (' + s0.spi.toFixed(1) + ' → ' + s1.spi.toFixed(1) + ')');
    T.ok(s1.breakdown.some(function (x) { return x.stat === 'spi' && /Dark Inspiration/.test(x.source); }), 'listed in the Spirit breakdown');

    T.group('enchants: only what a Warlock can use and the sim counts');
    var E = WL.ENCHANTS, names = Object.keys(E).map(function (k) { return E[k].from + ' / ' + E[k].name; }).join('\n');
    ['Presence of Sight', "Falcon's Call", 'Presence of Might', "Syncretist's Sigil", "Vodouisant's Vigilant Embrace", 'Prophetic Aura', "Animist's Caress", 'Might of the Scourge'].forEach(function (n) {
      T.ok(names.indexOf(n) < 0, n + ' is out');
    });
    T.ok(/Hoodoo Hex/.test(names) && /Power of the Scourge/.test(names) && /Zandalar Signet of Mojo/.test(names), "the Warlock's Zul'Gurub enchant and the caster shoulder enchants stay");
    T.ok(Object.keys(E).every(function (k) { var s = E[k].stats; return ['sp', 'shadowSp', 'fireSp', 'hitPct', 'critPct', 'hastePct', 'pierce', 'spellPen', 'int', 'spi', 'mp5', 'sta'].some(function (x) { return s[x]; }); }), 'every enchant gives a stat the sim uses');

    T.group('Destro Incinerate Imp off the sheet (user)');
    var own = WL.BUILDS.filter(function (x) { return !x.custom; }).map(function (x) { return x.key; });
    T.ok(own.indexOf('destro_incin_imp') < 0 && own.length === 5, 'five builds: ' + own.join(', '));
    var gone = WL.findBuild('destro_incin_imp'); T.ok(!!gone && WL.validateBuild(gone).length === 0, 'kept as a legal test fixture');
  });

  T.run('round 166: cheat mode', function () {
    var b = sheet('demo_pact_succ_sb'), c0 = det(), c1 = det(function (c) { c.options.cheat = { hit: { shadowBolt: true, 'pet:melee': true }, crit: { shadowBolt: true, 'pet:lashOfPain': true } }; });
    T.ok(WL.DEFAULT_CONFIG.options.cheat && !Object.keys(WL.DEFAULT_CONFIG.options.cheat.hit).length, 'off by default');
    var r0 = WL.simulateOnce(b, 'human', c0, { seed: 4, duration: 180 }), r1 = WL.simulateOnce(b, 'human', c1, { seed: 4, duration: 180 });
    var sb = r1.bySpell.shadowBolt, pm = r1.bySpell['pet:melee'], lp = r1.bySpell['pet:lashOfPain'];
    T.ok(sb.misses === 0 && sb.crits === sb.landed && sb.landed > 10, 'Shadow Bolt: no miss, every one a crit (' + sb.crits + ' / ' + sb.landed + ')');
    T.ok(pm.misses === 0 && pm.casts > 50, 'Succubus melee: no miss and no dodge (' + pm.casts + ' swings)');
    T.ok(lp.crits === lp.landed, 'Lash of Pain: every landed one crits');
    T.ok(r0.bySpell.shadowBolt.misses > 0 || r0.bySpell.shadowBolt.crits < r0.bySpell.shadowBolt.landed, 'the same fight without cheat mode: Shadow Bolt misses or does not always crit');
    var snap = WL.settingsSnapshot(c1), back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); WL.applySettings(back, JSON.parse(JSON.stringify(snap)));
    T.ok(back.options.cheat.hit.shadowBolt && back.options.cheat.crit['pet:lashOfPain'], 'settings codes keep it');
    var back2 = JSON.parse(JSON.stringify(c1)), s2 = WL.settingsSnapshot(det()); delete s2.options.cheat; WL.applySettings(back2, s2);
    T.eq(Object.keys(back2.options.cheat.hit).length, 0, 'a code without cheat mode switches it off');
  });

  T.run('round 166: Wowhead Forever talent links', function () {
    WL.BUILDS.forEach(function (b) {
      var l = WL.wowheadTalentLink(b), t = WL.parseWowheadTalents(l);
      var a = Object.keys(b.talents).filter(function (k) { return b.talents[k]; }).sort().map(function (k) { return k + b.talents[k]; }).join(','), z = Object.keys(t).sort().map(function (k) { return k + t[k]; }).join(',');
      T.eq(z, a, b.short + ': link → talents round trip');
    });
    T.eq(WL.wowheadTalentLink(sheet('demo_pact_succ_sb')), 'https://www.wowhead.com/forever/talent-calc/warlock/v2011-0005003231220301351-0550005003_t0/0bc1dddddggghhiiijkkllnnnpqqqrrrrrs2bbbbbcccccgggggjjj', 'Demo Pact Shadow Bolt: the link checked on Wowhead');
    var w = WL.parseWowheadTalents('https://www.wowhead.com/forever/talent-calc/warlock/v202-1-1_t0/0bb1a2a');
    T.eq(JSON.stringify(w), '{"suppression":2,"improvedHealthFunnel":1,"destructiveReach":1}', 'a link made on Wowhead (2 Suppression, 1 Improved Health Funnel, 1 Destructive Reach)');
    T.eq(JSON.stringify(WL.parseWowheadTalents('https://www.wowhead.com/forever/talent-calc/warlock/0bb1a')), '{"suppression":2,"improvedHealthFunnel":1}', 'only the clicks: read too');
    var err = ''; try { WL.parseWowheadTalents('https://www.wowhead.com/forever/talent-calc/mage/v2011'); } catch (e) { err = e.message; }
    T.ok(/mage/.test(err), 'another class: refused (' + err + ')');
    T.eq(WL.parseWowheadTalents('WFB1:abc'), null, 'a build code is not a Wowhead link');
  });

  T.run('round 166: a condition on a built-in action', function () {
    var b = sheet('demo_pact_succ_sb'), c = det();
    b.actWhen = { immolate: { t: 'fight', what: 'remaining', op: '>', v: 150 } };
    T.eq(WL.validateBuild(b).length, 0, 'a legal build');
    T.ok(/^Immolate if missing\/expiring — only when fight time left > 150 s$/.test(WL.actionLabel(b, 'immolate')), 'its label: ' + WL.actionLabel(b, 'immolate'));
    var r = WL.simulateOnce(b, 'human', c, { seed: 2, duration: 180, log: true });
    var im = r.log.filter(function (e) { return e.type === 'cast' && e.spell === 'immolate'; });
    T.ok(im.length >= 1 && im.every(function (e) { return e.t < 30 + 1e-6; }), 'Immolate only while more than 150 s are left (' + im.map(function (e) { return e.t.toFixed(1); }).join(', ') + ')');
    var d = WL.decodeBuild(WL.encodeBuild(b));
    T.eq(JSON.stringify(d.actWhen), JSON.stringify(b.actWhen), 'build codes keep it');
    b.actWhen = { immolate: { t: 'var', name: 'nope' } };
    T.ok(WL.validateBuild(b).length > 0, 'a condition naming an unknown variable is an error');
  });

  T.run('round 166: trinkets', function () {
    var b = sheet('demo_pact_succ_sb');
    T.eq(WL.equippedTrinkets(wear(det(), [18820])).length, 1, 'a worn Talisman of Ephemeral Power counts');
    var off = wear(det(), [18820]); off.gearBuilder.on = false;
    T.eq(WL.equippedTrinkets(off).length, 0, '… only while the gear builder is on');
    T.eq(WL.equippedTrinkets(wear(det(), [19406])).length, 0, 'a trinket without an effect here (Drake Fang Talisman) is not used');
    T.ok(Object.keys(WL.TRINKET_FX).every(function (id) { return WL.ITEMS[id]; }), 'every trinket with an effect is in the gear builder\'s list');

    T.group('Talisman of Ephemeral Power: +175 spell power for 15 s, 90 s cooldown');
    var c = wear(det(), [18820]), r = WL.simulateOnce(b, 'human', c, { seed: 1, duration: 300, log: true });
    var uses = r.log.filter(function (e) { return e.type === 'trinket'; }).map(function (e) { return e.t; });
    T.ok(uses.length >= 2 && uses.slice(1).every(function (t, i) { return t - uses[i] >= 90 - 1e-6; }), 'used ' + uses.length + ' times, a cooldown apart (' + uses.map(function (t) { return t.toFixed(1); }).join(', ') + ')');
    var dps = function (cc, n) { var s = 0; for (var i = 1; i <= n; i++) s += WL.simulateOnce(b, 'human', cc, { seed: i, duration: 180 }).dps; return s / n; };
    var base = dps(det(), 40), toep = dps(c, 40), nev = dps(wear(det(function (x) { x.options.trinketUse = { trinket1: 'never' }; }), [18820]), 40);
    T.ok(toep > base + 5, 'more DPS (' + base.toFixed(1) + ' → ' + toep.toFixed(1) + ')');
    T.near(nev, base, 1e-6, '"never": the same as without it');

    T.group('The Black Book: demon damage × 2 for 30 s');
    var bb = WL.simulateOnce(b, 'human', wear(det(function (x) { x.options.trinketUse = { trinket1: 'ready' }; }), [19337]), { seed: 3, duration: 25 }), nb = WL.simulateOnce(b, 'human', det(), { seed: 3, duration: 25 });
    var q = bb.bySpell['pet:melee'].dmg / nb.bySpell['pet:melee'].dmg;
    T.ok(q > 1.7 && q <= 2 + 1e-9, 'used with the first damaging cast: her melee in the first 25 s deals almost twice as much (× ' + q.toFixed(3) + ')');

    T.group('Warmth of Forgiveness: 500 mana when 500 are missing');
    var wf = WL.simulateOnce(b, 'human', wear(det(), [23027]), { seed: 1, duration: 180, log: true });
    T.ok(wf.log.some(function (e) { return e.type === 'trinket' && /Warmth/.test(e.spell); }), 'used');

    T.group('Shard of the Fallen Star: its own hit');
    var sh = WL.simulateOnce(b, 'human', wear(det(function (x) { x.options.trinketUse = { trinket1: 'ready' }; }), [21891]), { seed: 1, duration: 180 });
    var row = sh.bySpell['trinket:21891'];
    T.ok(row && row.casts >= 1 && (row.landed === 0 || row.dmg >= 400 * row.landed * 0.99), 'thrown, 400–442 per hit (' + (row ? row.landed + ' hits, ' + Math.round(row.dmg) : '—') + ')');
  });

  T.async('round 166: the fight-length table is current', function (done) {
    var L = WL.LENGTH_TABLE;
    T.group('data/length-table.js');
    if (!L) { T.ok(false, 'data/length-table.js is loaded'); done(); return; }
    T.eq(JSON.stringify(L.durations), '[60,120,180,240,300]', 'five fight lengths');
    var builtins = WL.BUILDS.filter(function (b) { return !b.custom; });
    T.eq(L.rows.length, builtins.length * WL.SIM_RACE_KEYS.length, 'one row per built-in build × race');
    var hex = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); };
    var files = Object.keys(L.src || {});
    Promise.all(files.map(function (f) {
      return fetch('../' + f).then(function (r) { return r.text(); }).then(function (t) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t.replace(/\r\n/g, '\n'))).then(function (h) { return { f: f, ok: hex(h) === L.src[f] }; });
      });
    })).then(function (hs) {
      T.ok(files.length >= 14, files.length + ' engine / data files recorded');
      hs.forEach(function (h) { T.ok(h.ok, h.f + ' unchanged since the table was made (else run node tools/gen-length-table.js)'); });
      // A worker with its own (shipped) default config: the 180 s column = the default fight. (The page's WL.DEFAULT_CONFIG may
      // have been changed by earlier tests.)
      var b0 = builtins[0], want = L.rows.filter(function (r) { return r.build === b0.key && r.race === 'human'; })[0].dps[2], pool = WL.makeSimPool('../engine/worker.js', 1), got = null;
      pool.run([{ kind: 'combo', build: b0, race: 'human' }], function (j, res) { got = res.r.dps; }, function () {
        T.near(got, want, 0.051, b0.short + ', Human, 180 s: re-simulated on a worker = shipped (' + want + ')');
        done();
      });
    });
  });
})();
