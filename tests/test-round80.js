// Round 80 tests (user, Forever patch): "Eureka! no longer benefits periodic effects at all. Channeled spells do not
// count as periodics." → +10% on direct hits and channel ticks, nothing on DoT ticks (A31).
(function () {
  function det() {                                          // 100% hit, no crit, no buffs/debuffs → exact damage
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.combat.baseHitPct = 100; c.combat.maxHitPct = 100; c.gear.hitPct = 0; c.gear.critPct = 0; c.gear.weaponIsSword = false;
    c.gear.pierce = 0; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false; c.options.includePetDamage = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    return c;
  }
  function tb(rot, t) { return { key: 't80', short: 't', name: 't', notes: '', talents: t || {}, pet: null, sacrifice: null, oil: 'none', rotation: rot }; }
  function inAura(r, t) { return (r.auras.eureka || []).some(function (iv) { return t > iv[0] + 1e-6 && t < iv[1] - 1e-6; }); }
  function outAura(r, t) { return !(r.auras.eureka || []).some(function (iv) { return t >= iv[0] - 1e-6 && t <= iv[1] + 1e-6; }); }
  function split(r, type, spell) {
    var l = r.log.filter(function (e) { return e.type === type && e.spell === spell && !e.crit; });
    return { inn: l.filter(function (e) { return inAura(r, e.t); }), out: l.filter(function (e) { return outAura(r, e.t); }) };
  }

  T.run('round 80: Eureka! skips periodic effects, channels still count', function () {
    T.group('channel ticks (Drain Life) +10%');
    var r = WL.simulateOnce(tb(['drainLife']), 'gnome', det(), { seed: 2, duration: 60, log: true });
    var d = split(r, 'tick', 'drainLife');
    T.ok(d.inn.length >= 2 && d.out.length >= 2, 'Drain Life ticks inside (' + d.inn.length + ') and outside (' + d.out.length + ') the aura');
    T.ok(d.inn.length && d.out.length && d.inn.every(function (e) { return Math.abs(e.dmg / d.out[0].dmg - 1.10) < 0.01; }), 'channel ticks in the aura = 1.10 × (' + (d.inn[0] && d.inn[0].dmg) + ' vs ' + (d.out[0] && d.out[0].dmg) + ')');

    T.group('DoT ticks: no bonus; direct hits +10% (Immolate: hit yes, burn no)');
    // Eureka! is popped before a long cast: the 3 charges go to Shadow Bolts (~9 s of aura), so Corruption and Immolate tick inside it
    var r2 = WL.simulateOnce(tb(['corruption', 'immolate', 'shadowBolt']), 'gnome', det(), { seed: 3, duration: 90, log: true });
    var c = split(r2, 'tick', 'corruption'), im = split(r2, 'tick', 'immolate'), ih = split(r2, 'hit', 'immolate'), sb = split(r2, 'hit', 'shadowBolt');
    T.ok(c.inn.length > 0 && c.inn.every(function (e) { return Math.abs(e.dmg - c.out[0].dmg) <= 1; }), 'Corruption ticks unchanged in the aura (' + c.inn.length + ' ticks)');
    T.ok(im.inn.length > 0 && im.inn.every(function (e) { return Math.abs(e.dmg - im.out[0].dmg) <= 1; }), "Immolate's burn unchanged in the aura (" + im.inn.length + ' ticks)');
    var sbIn = r2.log.filter(function (e) { return e.type === 'hit' && e.spell === 'shadowBolt' && !e.crit && (r2.auras.eureka || []).some(function (iv) { return e.t > iv[0] + 1e-6 && e.t <= iv[1] + 1e-6; }); });
    T.ok(sbIn.length === 3 && sbIn.every(function (e) { return Math.abs(e.dmg / sb.out[0].dmg - 1.10) < 0.01; }), 'the 3 empowered Shadow Bolts hit 1.10 × (' + sbIn.map(function (e) { return e.dmg; }).join(', ') + ' vs ' + (sb.out[0] && sb.out[0].dmg) + ')');
    // Immolate inside the aura: a timeline puts a Shadow Bolt first (Eureka! pops before it), Immolate is the 2nd empowered cast
    var b3 = tb(['immolate', 'shadowBolt']); b3.timeline = [{ t: 0, k: 'shadowBolt' }];
    var r3 = WL.simulateOnce(b3, 'gnome', det(), { seed: 3, duration: 60, log: true });
    ih = split(r3, 'hit', 'immolate');
    var ihIn = r3.log.filter(function (e) { return e.type === 'hit' && e.spell === 'immolate' && !e.crit && (r3.auras.eureka || []).some(function (iv) { return e.t > iv[0] + 1e-6 && e.t <= iv[1] + 1e-6; }); });
    T.ok(ihIn.length > 0 && ih.out.length > 0 && Math.abs(ihIn[0].dmg / ih.out[0].dmg - 1.10) < 0.01, "Immolate's direct hit 1.10 × (" + (ihIn[0] && ihIn[0].dmg) + ' vs ' + (ih.out[0] && ih.out[0].dmg) + ')');

    T.group('other races and the default results');
    T.ok(!('eurekaPolicy' in WL.DEFAULT_CONFIG.options), 'no separate Eureka! pop setting any more (round 88; rounds 38–87: any / long / doom)');
    var h = WL.simulateOnce(tb(['drainLife']), 'human', det(), { seed: 2, duration: 60, log: true });
    T.eq((h.auras.eureka || []).length, 0, 'no Eureka! aura for a Human');
  });
})();
