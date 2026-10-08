// Round 131 tests (user): Flametongue Totem and Windfury Totem no longer stack, and neither stacks with Grace of Air Totem.
// Of those that are switched on only the first listed counts (Windfury, then Flametongue, then Grace of Air). Windfury /
// Grace of Air / Tranquil Air stay one totem type (round 125); Flametongue and Tranquil Air can still be up together.
(function () {
  function det(on, f) {
    var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
    c.gear.weaponIsSword = false; c.fight.durationVarPct = 0; c.options.useCurseOfElements = false; c.combat.levelResist.on = false;
    Object.keys(c.buffs).forEach(function (k) { c.buffs[k].on = false; });
    Object.keys(c.debuffs).forEach(function (k) { c.debuffs[k].on = false; });
    Object.keys(c.consumables).forEach(function (k) { c.consumables[k].on = false; });
    (on || []).forEach(function (k) { c.buffs[k].on = true; });
    if (f) f(c);
    return c;
  }
  var b = { key: 't131', short: 't', name: 't', notes: '', talents: {}, pet: 'succubus', sacrifice: null, oil: 'none', rotation: ['shadowBolt'] };
  var WF = 'windfuryTotem', FT = 'flametongueTotem', GA = 'graceOfAir', TA = 'tranquilAir';
  function names(on) { return WL.activeBuffs(det(on)).map(function (x) { return x.name.replace(' Totem', ''); }).join(' + '); }
  function run(on) { return WL.simulateOnce(b, 'human', det(on), { seed: 7, duration: 120 }); }
  function casts(r, k) { return (r.bySpell[k] || { casts: 0 }).casts; }
  function agi(on) { return WL.computeStats(b, 'human', det(on)).agi; }
  function ratio(r) {                                               // your threat per point of your own damage
    var mine = 0; Object.keys(r.bySpell).forEach(function (k) { if (k.indexOf('pet:') !== 0) mine += r.bySpell[k].dmg; });
    return r.threat / mine;
  }

  T.run('round 131: Windfury, Flametongue and Grace of Air Totem do not stack', function () {
    var B = WL.DEFAULT_CONFIG.buffs, keys = Object.keys(B);
    T.group('which buffs cannot be up together');
    T.ok(WL.buffsClash(B[WF], B[FT]) && WL.buffsClash(B[FT], B[WF]), 'Windfury Totem and Flametongue Totem');
    T.ok(WL.buffsClash(B[FT], B[GA]) && WL.buffsClash(B[GA], B[FT]), 'Flametongue Totem and Grace of Air Totem');
    T.ok(WL.buffsClash(B[WF], B[GA]), 'Windfury Totem and Grace of Air Totem (as since round 124)');
    T.ok(WL.buffsClash(B[WF], B[TA]) && WL.buffsClash(B[GA], B[TA]), 'Tranquil Air Totem with Windfury and with Grace of Air (as since round 125)');
    T.ok(!WL.buffsClash(B[FT], B[TA]), 'Flametongue Totem and Tranquil Air Totem can be up together');
    T.ok(!WL.buffsClash(B[WF], B[WF]), 'a buff does not clash with itself');
    var others = keys.filter(function (k) { return [WF, FT, GA, TA].indexOf(k) < 0; });
    T.ok(others.every(function (k) { return WL.buffExcl(B[k]).length === 0 && !WL.buffsClash(B[k], B[FT]); }), 'no other raid buff is touched (' + others.length + ' checked)');
    T.ok(keys.indexOf(WF) < keys.indexOf(FT) && keys.indexOf(FT) < keys.indexOf(GA), 'listed in the order Windfury, Flametongue, Grace of Air');
    T.eq(WL.buffExcl({ excl: 'x' }).join() + '|' + WL.buffExcl({ excl: ['x', 'y'] }).join() + '|' + WL.buffExcl({}).length + '|' + WL.buffExcl(null).length, 'x|x,y|0|0', 'a tag may be one name or a list');

    T.group('several switched on: the first listed counts');
    T.eq(names([WF, FT]), 'Windfury', 'Windfury + Flametongue: only Windfury');
    T.eq(names([FT, GA]), 'Flametongue', 'Flametongue + Grace of Air: only Flametongue');
    T.eq(names([WF, FT, GA]), 'Windfury', 'all three: only Windfury');
    T.eq(names([FT, TA]), 'Flametongue + Tranquil Air', 'Flametongue + Tranquil Air: both');
    T.eq(names([FT, GA, TA]), 'Flametongue + Tranquil Air', 'Flametongue + Grace of Air + Tranquil Air: Grace of Air is out, so Tranquil Air counts');
    T.eq(names([WF, FT, GA, TA]), 'Windfury', 'all four: only Windfury');
    T.eq(names([WF]) + ' / ' + names([FT]) + ' / ' + names([GA]) + ' / ' + names([TA]), 'Windfury / Flametongue / Grace of Air / Tranquil Air', 'each alone counts');

    T.group('in the fight');
    var rW = run([WF]), rF = run([FT]), rWF = run([WF, FT]), rFG = run([FT, GA]), rAll = run([WF, FT, GA]), r0 = run([]);
    T.ok(casts(rW, 'pet:windfury') > 0 && casts(rF, 'pet:flametongue') > 0, 'test setup: Windfury alone gives extra attacks, Flametongue alone Fire hits');
    T.eq(casts(rWF, 'pet:flametongue'), 0, 'Windfury + Flametongue: no Flametongue hits');
    T.eq(rWF.total, rW.total, 'the same fight as with Windfury alone, to the last point of damage');
    T.eq(rAll.total, rW.total, 'all three: the same fight as with Windfury alone');
    T.eq(casts(rFG, 'pet:flametongue') + '/' + rFG.total, casts(rF, 'pet:flametongue') + '/' + rF.total, 'Flametongue + Grace of Air: the same fight as with Flametongue alone');
    T.near(agi([FT, GA]) - agi([]), 0, 1e-9, 'and no Agility from Grace of Air then');
    T.near(agi([GA]) - agi([]), 89, 1e-9, 'Grace of Air alone still gives its 89 Agility');
    T.ok(rF.total > r0.total && rW.total > r0.total, 'each totem alone still adds damage');
    var rFT = run([FT, TA]);
    T.near(ratio(rFT) / ratio(r0), 0.80, 1e-9, 'Flametongue + Tranquil Air: −20% threat');
    T.eq(casts(rFT, 'pet:flametongue'), casts(rF, 'pet:flametongue'), 'and the Flametongue hits');

    T.group('descriptions and settings codes');
    T.ok(/not with Flametongue/.test(B[WF].desc) && /not with Windfury or Grace of Air/.test(B[FT].desc) && /Flametongue/.test(B[GA].desc), 'each of the three names the others it does not stack with');
    var back = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)), unknown = WL.applySettings(back, WL.decodeSettings(WL.encodeSettings(det([WF, FT]))));
    T.eq(back.buffs[WF].on + '/' + back.buffs[FT].on + '/' + unknown.length, 'true/true/0', 'an old code with both totems on still loads');
    T.eq(WL.activeBuffs(back).filter(function (x) { return x.windfury || x.flametongue; }).map(function (x) { return x.name; }).join(), 'Windfury Totem', 'and only Windfury Totem counts in it');
    T.ok(Array.isArray(back.buffs[WF].excl) && back.buffs[FT].excl === 'meleeTotem', 'loading a code leaves the totem types alone');
  });
})();
