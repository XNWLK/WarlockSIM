// Round 278 tests (user: "create an import/export APL button in our build creator and in the talents & rotation tab of the
// builds that creates a code to import/export the rotation so that it can be used with [another Forever sim]. you'll have to
// find out how their format works."). engine/apl-io.js: WL.aplExport / WL.aplImport / WL.aplToBuild; the buttons in
// index.html / app/app.js. Fixtures: two of the other sim's preset rotations (one as JSON, one as its rotation text). [A134]
(function () {
  var FIX_JSON = {"type":"TypeAPL","priorityList":[{"action":{"autocastOtherCooldowns":{}}},{"action":{"condition":{"not":{"val":{"warlockAssignedCurseIsActive":{}}}},"castWarlockAssignedCurse":{}}},{"hide":true,"action":{"condition":{"or":{"vals":[{"and":{"vals":[{"auraIsActive":{"sourceUnit":{"type":"CurrentTarget"},"auraId":{"spellId":603},"includeReactionTime":true}},{"cmp":{"op":"OpLe","lhs":{"auraRemainingTime":{"sourceUnit":{"type":"CurrentTarget"},"auraId":{"spellId":603}}},"rhs":{"const":{"val":"2s"}}}}]}},{"and":{"vals":[{"auraIsInactive":{"sourceUnit":{"type":"CurrentTarget"},"auraId":{"spellId":603},"includeReactionTime":true}},{"not":{"val":{"spellIsReady":{"spellId":{"spellId":603}}}}},{"cmp":{"op":"OpGt","lhs":{"remainingTime":{}},"rhs":{"math":{"op":"OpAdd","lhs":{"spellTimeToReady":{"spellId":{"spellId":603}}},"rhs":{"auraDuration":{"sourceUnit":{"type":"CurrentTarget"},"auraId":{"spellId":603}}}}}}}]}},{"cmp":{"op":"OpLe","lhs":{"remainingTime":{}},"rhs":{"variableRef":{"name":"Doom tick"}}}}]}},"groupReference":{"groupName":"Cooldowns"}}},{"action":{"condition":{"cmp":{"op":"OpGe","lhs":{"remainingTime":{}},"rhs":{"variableRef":{"name":"Doom tick"}}}},"castSpell":{"spellId":{"spellId":603}}}},{"action":{"condition":{"auraIsActive":{"auraId":{"spellId":17941}}},"castSpell":{"spellId":{"spellId":11661}}}},{"action":{"condition":{"and":{"vals":[{"variableRef":{"name":"Agony time"}},{"not":{"val":{"auraIsActive":{"auraId":{"spellId":18288}}}}}]}},"castSpell":{"spellId":{"spellId":18288}}}},{"action":{"condition":{"variableRef":{"name":"Agony time"}},"strictMultidot":{"spellId":{"spellId":11713},"maxDots":10,"maxOverlap":{"spellCastTime":{"spellId":{"spellId":11713}}}}}},{"action":{"condition":{"cmp":{"op":"OpGt","lhs":{"spellExpectedDpet":{"spellId":{"spellId":11672}}},"rhs":{"variableRef":{"name":"DPET Non DoT"}}}},"strictMultidot":{"spellId":{"spellId":11672},"maxDots":10,"maxOverlap":{"spellCastTime":{"spellId":{"spellId":11672}}}}}},{"action":{"condition":{"cmp":{"op":"OpGt","lhs":{"spellExpectedDpet":{"spellId":{"spellId":18881}}},"rhs":{"variableRef":{"name":"DPET Non DoT"}}}},"strictMultidot":{"spellId":{"spellId":18881},"maxDots":10,"maxOverlap":{"spellCastTime":{"spellId":{"spellId":18881}}}}}},{"action":{"condition":{"cmp":{"op":"OpGt","lhs":{"spellExpectedDpet":{"spellId":{"spellId":11668}}},"rhs":{"variableRef":{"name":"DPET Non DoT"}}}},"strictMultidot":{"spellId":{"spellId":11668},"maxDots":10,"maxOverlap":{"spellCastTime":{"spellId":{"spellId":11668}}}}}},{"action":{"condition":{"and":{"vals":[{"cmp":{"op":"OpLt","lhs":{"currentManaPercent":{}},"rhs":{"const":{"val":"30%"}}}},{"cmp":{"op":"OpGt","lhs":{"remainingTime":{}},"rhs":{"const":{"val":"60s"}}}}]}},"castSpell":{"spellId":{"spellId":11689}}}},{"action":{"castSpell":{"spellId":{"spellId":11661}}}},{"action":{"castSpell":{"spellId":{"spellId":11689}}}}],"valueVariables":[{"name":"Doom tick","value":{"const":{"val":"60s"}}},{"name":"Agony time","value":{"and":{"vals":[{"not":{"val":{"dotIsActive":{"spellId":{"spellId":603}}}}},{"not":{"val":{"dotIsActive":{"spellId":{"spellId":11713}}}}},{"or":{"vals":[{"cmp":{"op":"OpLt","lhs":{"remainingTime":{}},"rhs":{"variableRef":{"name":"Doom tick"}}}},{"not":{"val":{"spellIsReady":{"spellId":{"spellId":603}}}}}]}},{"cmp":{"op":"OpGt","lhs":{"spellExpectedDpet":{"spellId":{"spellId":11713}}},"rhs":{"variableRef":{"name":"DPET Non DoT"}}}}]}}},{"name":"DPET Non DoT","value":{"max":{"vals":[{"spellExpectedDpet":{"spellId":{"spellId":11661}}},{"spellExpectedDpet":{"spellId":{"spellId":17923}}},{"spellExpectedDpet":{"spellId":{"spellId":17926}}}]}}}]};
  var FIX_TEXT = "siml 1\nspec warlock\n\nvar ${Doom tick} = dot(bane_of_doom).base_duration\nvar ${Amount of Dooms left} = (remaining_time - 5s) / dot(bane_of_doom).base_duration\nvar ${in 5y range of 3T} =\n    number_targets >= 3\n    and target.unit_distance <= 5\n    and next_target.unit_distance <= 5\n    and previous_target.unit_distance <= 5\nvar ${Searing Pain for Brand} =\n    (not target1.aura(demonic_brand).is_active(include_reaction_time=true) or target1.aura(demonic_brand).remaining_time < 2.5s)\n    and not spell(searing_pain).is_casting\n    and not $in_5y_range_of_3t\n\nprepull:\n  ((spell(soul_fire).cast_time + spell(soul_fire).travel_time) * -0.9) cast soul_fire\n  -1s pet_attack\n  -0.1s cast immolate\n\npriority:\n  autocast_other_cooldowns\n  group \"Single/Multi Target Curse Logic\"\n  move 5 recheck if number_targets >= 3 and target.unit_distance > 5 and not target.unit_is_moving\n  cast bane_of_doom on target1 if remaining_time > $doom_tick\n  cast searing_pain on target1 if $searing_pain_for_brand\n  group \"Single Target DoT Logic\" if number_targets == 1\n  group \"Multi Target DoT Logic\" if number_targets > 1\n  group \"Cooldowns\"\n      if $amount_of_dooms_left < 1 and not target1.dot(bane_of_doom).is_active\n      or (target1.dot(bane_of_doom).is_active or $in_5y_range_of_3t)\n  cast hellfire if $in_5y_range_of_3t\n  cast soul_fire\n      if not $in_5y_range_of_3t\n      and aura(decimation).is_active(include_reaction_time=true)\n      and remaining_time > spell(soul_fire).cast_time + spell(soul_fire).travel_time\n      and not spell(soul_fire).is_casting\n  cast death_coil if spell(searing_pain).cast_time > remaining_time\n  cast life_tap if current_mana_percent < 35% and remaining_time > 60s\n  cast searing_pain\n  cast life_tap\n\ngroup \"Single/Multi Target Curse Logic\":\n  cast_warlock_assigned_curse\n      if not warlock_assigned_curse_is_active\n      and not warlock_is_assigned_curse(no_curse)\n  change_target(new_target=next_target)\n      if warlock_assigned_curse_is_active\n      and not warlock_assigned_curse_is_active_on_all_targets\n      and number_targets > 1\n\ngroup \"Multi Target DoT Logic\":\n  cast bane_of_agony\n      if not dot(bane_of_doom).is_active\n      and not dot(bane_of_agony).is_active\n      and number_targets < 5\n  change_target(new_target=next_target)\n      if (dot(bane_of_agony).is_active or dot(bane_of_doom).is_active)\n      and not warlock_bane_is_active_on_all_targets\n      and (warlock_assigned_curse_is_active or warlock_is_assigned_curse(no_curse))\n      and number_targets < 5\n  cast immolate\n      if not dot(immolate).is_active\n      and remaining_time > dot(immolate).base_duration\n      and not $in_5y_range_of_3t\n  change_target(new_target=next_target)\n      if dot(immolate).is_active\n      and not dot(immolate).is_active_on_all_targets\n      and (warlock_assigned_curse_is_active or warlock_is_assigned_curse(no_curse))\n      and ((dot(bane_of_agony).is_active or dot(bane_of_doom).is_active) or not number_targets < 5)\n      and (remaining_time > dot(immolate).base_duration and not $in_5y_range_of_3t)\n  cast corruption\n      if not dot(corruption).is_active\n      and remaining_time > dot(corruption).base_duration\n      and not $in_5y_range_of_3t\n  change_target(new_target=next_target)\n      if dot(corruption).is_active\n      and not dot(corruption).is_active_on_all_targets\n      and (warlock_assigned_curse_is_active or warlock_is_assigned_curse(no_curse))\n      and ((dot(bane_of_agony).is_active or dot(bane_of_doom).is_active) or not number_targets < 5)\n      and dot(immolate).is_active\n      and (remaining_time > dot(corruption).base_duration and not $in_5y_range_of_3t)\n  change_target(new_target=target1)\n      if (warlock_assigned_curse_is_active_on_all_targets or warlock_is_assigned_curse(no_curse))\n      and (warlock_bane_is_active_on_all_targets or not number_targets < 5)\n      and (dot(immolate).is_active_on_all_targets or not (remaining_time > dot(immolate).base_duration and not $in_5y_range_of_3t))\n      and (dot(corruption).is_active_on_all_targets or not (remaining_time > dot(corruption).base_duration and not $in_5y_range_of_3t))\n\ngroup \"Single Target DoT Logic\":\n  cast bane_of_agony\n      if not dot(bane_of_doom).is_active\n      and not dot(bane_of_agony).is_active\n      and remaining_time > dot(bane_of_agony).base_duration\n  cast immolate if not dot(immolate).is_active and remaining_time > dot(immolate).base_duration\n  cast corruption\n      if not dot(corruption).is_active\n      and remaining_time > dot(corruption).base_duration\n\ngroup \"Cooldowns\":\n  cast item.talisman_of_ephemeral_power\n      if target1.dot(bane_of_doom).remaining_time < 15s and target1.dot(bane_of_doom).is_active\n      or not target1.dot(bane_of_doom).is_active\n  cast item.major_spellblasting_potion\n      if target1.dot(bane_of_doom).remaining_time < 30s and target1.dot(bane_of_doom).is_active\n      or not target1.dot(bane_of_doom).is_active\n  cast eureka\n      if target1.dot(bane_of_doom).remaining_time < 8s and target1.dot(bane_of_doom).is_active\n      or not target1.dot(bane_of_doom).is_active\n  cast blood_fury\n      if target1.dot(bane_of_doom).remaining_time < 15s and target1.dot(bane_of_doom).is_active\n      or not target1.dot(bane_of_doom).is_active\n  cast berserking\n      if target1.dot(bane_of_doom).remaining_time < 15s and target1.dot(bane_of_doom).is_active\n      or not target1.dot(bane_of_doom).is_active\n  cast searing_pain\n      if target1.dot(bane_of_doom).remaining_time < 15s\n      and target1.dot(bane_of_doom).is_active\n      and number_targets == 1\n  cast life_tap\n      if (target1.dot(bane_of_doom).remaining_time < 22s or not target1.dot(bane_of_doom).is_active)\n      and (current_mana < 2600 and remaining_time > 60s)\n";
  // Shadow Demo's export after a trip through the other sim (imported there, then its rotation export, 2026-11-28): its own
  // names and layout, the defaults left out, the markers as notes
  var FIX_BACK = "siml 1\nspec warlock\n\npriority:\n  /// Death Coil as the finisher (when the filler would not land before the boss dies) [deathCoilFinisher #cexr3c]\n  cast death_coil if remaining_time < spell(shadow_bolt_rank9).cast_time\n  /// Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) [bane #2gtv5b]\n  cast bane_of_doom\n      if not dot(bane_of_doom).is_active\n      and not dot(bane_of_agony).is_active\n      and remaining_time >= 60s\n  /// Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) [bane #xoce7a]\n  cast bane_of_agony\n      if not dot(bane_of_doom).is_active\n      and not dot(bane_of_agony).is_active\n      and remaining_time >= 12s\n  /// Curse of the Elements if missing [curseOfElements #qk7k70]\n  cast curse_of_the_elements\n      if warlock_is_assigned_curse\n      and not target.aura(curse_of_the_elements).is_active\n      and remaining_time > 10s\n  /// Searing Pain to (re)apply Demonic Brand when it is down [searingPainBrand #5j8eih]\n  cast searing_pain\n      if talent_rank(demonic_brand) >= 1\n      and not warlock_active_pet\n      and target.aura(demonic_brand).num_stacks <= 0\n  /// Corruption if missing/expiring [corruption #xhi09e]\n  cast corruption\n      if dot(corruption).remaining_time <= spell(corruption).cast_time\n      and remaining_time >= spell(corruption).cast_time + 6s\n  /// Life Tap when the rest of the fight needs more mana than you have and no free mana is ready (below 80% mana, more than 45 s left) [lifeTapNeed:80,45 #4biqlh]\n  cast life_tap if current_mana_percent < 80% and remaining_time > 45s\n  /// Activate trinket (every on-use trinket that is ready; off the GCD) [activateTrinket #pi8cvb]\n  autocast_other_cooldowns\n  /// Shadow Bolt (filler) [shadowBolt #4n7frt]\n  cast shadow_bolt_rank9\n  /// Life Tap when nothing above can be cast (this sim does that by itself) [auto #yhs65z]\n  cast life_tap\n";
  function src(path) { try { var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(); return x.status === 200 || x.status === 0 ? x.responseText : ''; } catch (e) { return ''; } }
  function cfgOf(f) { var c = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG)); c.fight.durationVarPct = 0; if (f) f(c); return c; }
  function sheet(k) { return JSON.parse(JSON.stringify(WL.BUILDS.concat(WL.RETIRED_BUILDS || []).filter(function (b) { return b.key === k; })[0])); }
  function canon(x) { return JSON.stringify(WL.APL_IO.canon(x == null ? null : x)); }
  // the priority rows (round 283: the prepull rows above them are not counted)
  function rows(text) { return text.slice(text.indexOf('\npriority:\n')).split('\n').filter(function (l) { return /^ {2}`/.test(l); }).map(function (l) { return JSON.parse(l.trim().slice(1, -1)); }); }
  if (WL.APL_IO) WL.APL_IO.precastFights = 8;   // round 283: the export's precast pick in fewer fights (speed; which spell it picks is not tested here)
  function apl(b) { return [b.rotation, WL.cleanParams(b.params, b.rotation) || null, b.actWhen || null]; }
  function dps(b, c, seed, dur) { return WL.simulateOnce(b, 'undead', c, { seed: seed, duration: dur || 120 }).dps; }
  function strip(text) { return text.split('\n').map(function (l) { if (!/^ {2}`/.test(l)) return l; var o = JSON.parse(l.trim().slice(1, -1)); delete o.notes; return '  `' + JSON.stringify(o) + '`'; }).join('\n'); }
  var KNOWN_IDS = [11661, 25307, 17923, 11668, 25309, 11672, 25311, 1311680, 11713, 603, 1225228, 18881, 11700, 11675, 11689, 17926, 18871, 18932, 1293813, 17924, 1316697, 11684, 11678, 18288];   // round 281: + Amplify Curse
  var KINDS = ['and', 'or', 'not', 'cmp', 'math', 'const', 'dotIsActive', 'dotRemainingTime', 'auraIsActive', 'auraRemainingTime', 'auraNumStacks', 'spellIsReady', 'spellTimeToReady',
    'spellCastTime', 'spellIsKnown', 'remainingTime', 'currentTime', 'currentHealthPercent', 'currentManaPercent', 'isExecutePhase', 'talentRank', 'warlockActivePet', 'warlockIsAssignedCurse', 'variableRef',
    'currentMana', 'maxMana', 'gcdIsReady', 'dotTimeToNextTick'];   // round 281: mana (Life Tap when needed, for the pet), a channel's interrupt condition
  function badValue(v, path) {                      // the first fault of an APL value's shape, or ''
    if (!v || typeof v !== 'object') return path + ': not an object';
    var k = Object.keys(v); if (k.length !== 1) return path + ': ' + k.length + ' kinds';
    var x = v[k[0]];
    if (KINDS.indexOf(k[0]) < 0) return path + ': kind ' + k[0];
    if (k[0] === 'and' || k[0] === 'or') { if (!(x.vals && x.vals.length >= 2)) return path + ': ' + k[0] + ' with fewer than 2 values'; for (var i = 0; i < x.vals.length; i++) { var e = badValue(x.vals[i], path + '.' + k[0]); if (e) return e; } return ''; }
    if (k[0] === 'not') return badValue(x.val, path + '.not');
    if (k[0] === 'cmp' || k[0] === 'math') {
      if ((k[0] === 'cmp' ? ['OpLt', 'OpLe', 'OpGt', 'OpGe', 'OpEq', 'OpNe'] : ['OpAdd', 'OpSub', 'OpMul', 'OpDiv']).indexOf(x.op) < 0) return path + ': op ' + x.op;
      return badValue(x.lhs, path + '.lhs') || badValue(x.rhs, path + '.rhs');
    }
    if (k[0] === 'const') return /^(-?\d+(\.\d+)?(s|%)?|true|false)$/.test(x.val) ? '' : path + ': const "' + x.val + '"';
    if (x.spellId && KNOWN_IDS.indexOf(x.spellId.spellId) < 0) return path + ': spell id ' + x.spellId.spellId;
    return '';
  }

  T.run('round 278: the export of every build is rows of APL JSON the other sim reads', function () {
    var builds = WL.BUILDS.filter(function (b) { return !b.custom; }).concat(WL.RETIRED_BUILDS || []), bad = [], nrows = 0;
    builds.forEach(function (b) {
      var e = WL.aplExport(b), R = rows(e.text), J = JSON.parse(e.json);
      if (e.text.indexOf('siml 1\nspec warlock\n') !== 0 || !/\npriority:\n/.test(e.text)) bad.push(b.key + ': header');
      if (canon(J.player.rotation.priorityList) !== canon(R) || J.player.rotation.type !== 'TypeAPL') bad.push(b.key + ': the JSON form differs from the text');
      R.forEach(function (it, i) {
        nrows++;
        var a = it.action || {}, k = Object.keys(a).filter(function (x) { return x !== 'condition'; });
        if (k.length > 1) bad.push(b.key + ' row ' + (i + 1) + ': ' + k.join('+'));
        if ((k[0] === 'castSpell' || k[0] === 'channelSpell') && KNOWN_IDS.indexOf(a[k[0]].spellId.spellId) < 0) bad.push(b.key + ' row ' + (i + 1) + ': spell id ' + a[k[0]].spellId.spellId);
        if (k.length && ['castSpell', 'channelSpell', 'autocastOtherCooldowns'].indexOf(k[0]) < 0) bad.push(b.key + ' row ' + (i + 1) + ': ' + k[0]);   // round 281: channels are channel rows
        if (k[0] === 'channelSpell') { var fi = badValue(a.channelSpell.interruptIf, 'interruptIf'); if (fi) bad.push(b.key + ' row ' + (i + 1) + ': ' + fi); }
        if (!k.length && !it.hide) bad.push(b.key + ' row ' + (i + 1) + ': an empty row that is not hidden');
        if (a.condition) { var f = badValue(a.condition, 'condition'); if (f) bad.push(b.key + ' row ' + (i + 1) + ': ' + f); }
      });
      (J.player.rotation.valueVariables || []).forEach(function (v) { var f = badValue(v.value, 'var ' + v.name); if (f) bad.push(b.key + ': ' + f); });
      var cast = R.filter(function (it) { return it.action && it.action.castSpell; }), last = cast[cast.length - 1];
      if (!last || last.action.castSpell.spellId.spellId !== 11689 || last.action.condition) bad.push(b.key + ': the last row is not the plain Life Tap');
    });
    T.ok(nrows > 100, nrows + ' rows of ' + builds.length + ' builds');
    T.eq(bad.slice(0, 6).join(' | '), '', 'every row: one action (cast or channel a known spell id / autocast other cooldowns / a hidden row), conditions of known kinds, ops and constants; the JSON form = the text; Life Tap under the filler');
    var sd = WL.aplExport(sheet('demo_pact_succ_sb')), r0 = rows(sd.text);
    T.ok(r0.some(function (it) { return it.action && it.action.autocastOtherCooldowns; }) && r0[r0.length - 1].action.castSpell.spellId.spellId === 11689, 'Shadow Demo: its "Activate trinket" → autocast other cooldowns; Life Tap last');
    T.eq(r0.filter(function (it) { return it.action && it.action.castSpell; }).map(function (it) { return it.action.castSpell.spellId.spellId; }).join(','), '17926,603,11713,1311680,17923,11672,11689,11661,11689', 'Shadow Demo: Death Coil, Doom, Agony, CoE, Searing Pain (Brand), Corruption, Life Tap, Shadow Bolt, Life Tap');
    T.ok(rows(WL.aplExport(sheet('destro_incin_succ')).text)[0].action.autocastOtherCooldowns, 'a build without "Activate trinket": autocast other cooldowns is the first row');
    var bk = WL.aplExport(sheet('demo_pact_succ_sb'), cfgOf(function (c) { c.options.bookRanks = true; }));
    T.ok(/"spellId":25307/.test(bk.text) && !/"spellId":11661/.test(bk.text), 'book ranks on: Shadow Bolt rank 10 (25307)');
    var hv = WL.aplExport(Object.assign(sheet('destro_incin_succ'), { talents: Object.assign(sheet('destro_incin_succ').talents, { baneOfHavoc: 1 }) }), cfgOf(function (c) { c.fight.targets = 2; }));
    T.ok(/"castSpell":\{"spellId":\{"spellId":1225228\},"target":\{"type":"Target","index":1\}\}/.test(hv.text), 'Targets 2 with Bane of Havoc: a Havoc row on target 2 (automatic here)');
    var pc = WL.aplExport(sheet('demo_pact_succ_sb'), cfgOf(function (c) { c.fight.precast = 'shadowBolt'; }));
    T.ok(/\nprepull:\n {2}`\{"action":\{"castSpell":\{"spellId":\{"spellId":11661\}\}\},"doAtValue"/.test(pc.text), 'Precast Shadow Bolt: a prepull row');
  });

  T.run('round 278: export → import gives the same build (markers), and the same fights', function () {
    var builds = WL.BUILDS.filter(function (b) { return !b.custom; }).concat(WL.RETIRED_BUILDS || []), bad = [], c = cfgOf();
    builds.forEach(function (b) {
      [WL.aplExport(b).text, WL.aplExport(b).json].forEach(function (t, j) {
        var im = WL.aplImport(t), tb = WL.aplToBuild(im.lines, b);
        if (im.error || tb.errors.length) { bad.push(b.key + (j ? ' (JSON)' : '') + ': ' + (im.error || tb.errors[0])); return; }
        if (canon(apl(tb.build)) !== canon(apl(b))) bad.push(b.key + (j ? ' (JSON)' : '') + ': ' + JSON.stringify(tb.build.rotation));
        if (!j && Math.abs(dps(tb.build, c, 1) - dps(b, c, 1)) > 1e-9) bad.push(b.key + ': DPS differs');
        if (im.warnings.length + tb.warnings.length) bad.push(b.key + ': warnings on the way back: ' + im.warnings.concat(tb.warnings)[0]);
      });
    });
    T.eq(bad.slice(0, 5).join(' | '), '', builds.length + ' builds (sheet + retired), text and JSON: the same priority, numbers and extra conditions, no warnings, the same DPS (seed 1)');
    var sdb = sheet('demo_pact_succ_sb');
    delete sdb.actWhen; if (sdb.params) delete sdb.params.searingPainBrand;   // round 281: the fixture is Shadow Demo as it was before round 282 (no brand renewal, no Life Tap gate)
    var back = WL.aplImport(FIX_BACK), tbb = WL.aplToBuild(back.lines, sdb);
    T.ok(!back.warnings.length && !tbb.errors.length && canon(apl(tbb.build)) === canon(apl(sdb)), 'Shadow Demo after a trip through the other sim (its own printing of the rows): exactly the build again');
    var w = sheet('wrack_ds'), t = WL.aplExport(w).text;
    T.ok(/\[when #[0-9a-z]{6}\]/.test(t), 'Wrack DS: Life Tap\'s extra condition (the 5-second rule, no equivalent) is kept whole in a hidden row');
    var ed = t.replace('"val":"40%"', '"val":"45%"'), im2 = WL.aplImport(ed), tb2 = WL.aplToBuild(im2.lines, w);
    T.ok(im2.notes.some(function (n) { return /changed in the other sim/.test(n); }) && tb2.build.rotation.indexOf('lifeTapNeed') < 0 && tb2.build.rotation.indexOf('lifeTapBelow') >= 0 && tb2.build.params.lifeTapBelow.pct === 45,
      'a row changed there (Life Tap below 45%) no longer fits its marker: read from its APL (Life Tap below 45% mana and more than 25 s left)');
    var bk = cfgOf(function (x) { x.options.bookRanks = true; }), sd = sheet('demo_pact_succ_sb'), im3 = WL.aplImport(strip(WL.aplExport(sd, bk).text));
    T.ok(im3.lines.some(function (l) { return l.spell === 'shadowBolt' && !l.when; }), 'book-rank ids (25307) read back as Shadow Bolt');
  });

  T.run('round 278: rows edited there (no markers): exact conditions decide exactly the same', function () {
    // every condition kind with an exact equivalent: export one rule, strip the marker, import, compare on many states
    var b = sheet('destro_incin_succ');
    b.rotation = ['corruption', 'immolate', 'rule:0', 'incinerate'];
    b.vars = { Late: { cond: { t: 'fight', what: 'elapsed', op: '>', v: 30 } }, Cap: { num: 42 } };
    var nodes = [];
    ['<', '<=', '>', '>=', '='].forEach(function (op) { [0, 3, { cast: 'immolate' }].forEach(function (v) { nodes.push({ t: 'dot', spell: 'immolate', op: op, v: v }); }); });
    ['<', '<=', '>', '>=', '='].forEach(function (op) { nodes.push({ t: 'aura', aura: 'shadowTrance', op: op, v: 0 }, { t: 'aura', aura: 'isb', op: op, v: { cast: 'shadowBolt' } }, { t: 'cd', spell: 'soulFire', op: op, v: op === '=' ? 0 : 5 }, { t: 'mana', op: op, v: 35 }, { t: 'brand', op: op, v: 2 }); });
    nodes.push({ t: 'aura', aura: 'coe', op: '<=', v: 0 }, { t: 'aura', aura: 'brand', op: '>', v: 2.5 }, { t: 'aura', aura: 'snfShadow', op: '<=', v: 3 }, { t: 'cd', spell: 'soulFire', op: '>', v: 0 },
      { t: 'fight', what: 'remaining', op: '>', v: 60 }, { t: 'fight', what: 'elapsed', op: '>=', v: 5 }, { t: 'fight', what: 'bossHp', op: '<', v: { exec: 1 } }, { t: 'fight', what: 'bossHp', op: '>=', v: { exec: 1 } },
      { t: 'fight', what: 'bossHp', op: '<=', v: 20 }, { t: 'mana', op: '<', v: { var: 'Cap' } }, { t: 'known', spell: 'conflagrate' }, { t: 'talent', talent: 'shadowAndFlame', op: '>=', v: 1 },
      { t: 'talent', talent: 'improvedShadowBolt', op: '=', v: 5 }, { t: 'pet' }, { t: 'setting', key: 'coe' }, { t: 'var', name: 'Late' }, { t: 'minDot', op: '>', v: 4 }, { t: 'minDot', op: '<=', v: 2 },
      { t: 'not', c: { t: 'any', c: [{ t: 'dot', spell: 'corruption', op: '>', v: 0 }, { t: 'pet' }] } }, { t: 'all', c: [{ t: 'not', c: { t: 'setting', key: 'coe' } }, { t: 'aura', aura: 'decimation', op: '>', v: 0 }] },
      { t: 'any', c: [{ t: 'all', c: [{ t: 'mana', op: '>', v: 50 }, { t: 'var', name: 'Late' }] }, { t: 'not', c: { t: 'known', spell: 'shadowburn' } }] });
    var DT = [0, 1, 2, 2.5, 3, 3.5, 4, 6, 12], bad = [], n = 0, seed = 7;
    var rnd = function (a) { seed = (seed * 16807) % 2147483647; return a[seed % a.length]; };
    nodes.forEach(function (node, ni) {
      var bb = JSON.parse(JSON.stringify(b)); bb.rules = [{ spell: 'searingPain', when: node }];
      var e = WL.aplExport(bb), im = WL.aplImport(strip(e.text)), line = im.lines.filter(function (l) { return l.spell === 'searingPain'; })[0];
      if (!line) { bad.push('node ' + ni + ': no line (' + (e.warnings.concat(im.warnings)[0] || '') + ')'); return; }
      if (e.warnings.some(function (w) { return /^Priority 3/.test(w); })) bad.push('node ' + ni + ': warned ' + e.warnings.filter(function (w) { return /^Priority 3/.test(w); })[0]);
      for (var k = 0; k < 300; k++) {
        var st = { t: rnd([0, 10, 40, 200]), rem: rnd([1, 10, 59, 60, 61, 200]), hp: rnd([10, 19.9, 20, 34.9, 35, 35.1, 80]), mana: rnd([0, 3000, 3500, 4200, 8000]), brand: rnd([0, 2, 3]), coeOn: rnd([true, false]), pet: rnd([null, 'imp']),
          ct: { immolate: rnd([0, 1.5, 2, 3]), shadowBolt: rnd([0, 2.5, 3]) }, has: rnd([true, false]), tal: rnd([0, 1, 5]) };
        var S = { t: st.t, remaining: st.rem, targetHpPct: st.hp, mana: st.mana, maxMana: 10000, brandCharges: st.brand, buffs: {}, cds: { soulFire: st.t + rnd([0, 2, 5, 9]) },
          cfg: { fight: { executePct: 35 }, options: { useCurseOfElements: st.coeOn } }, dots: { immolate: rnd(DT), corruption: rnd(DT) } };
        ['shadowTrance', 'isb', 'coe', 'brand', 'snfShadow', 'decimation'].forEach(function (a) { var x = rnd(DT); if (x) S.buffs[a] = S.t + x; });
        S.dotLeft = function (k2) { return S.dots[k2] || 0; }; S.buff = function (a) { return S.buffs[a] > S.t; }; S.has = function () { return st.has; }; S.castTime = function (k2) { return st.ct[k2] != null ? st.ct[k2] : 2; };
        var B = JSON.parse(JSON.stringify(bb)); B.pet = st.pet; B.talents.shadowAndFlame = st.tal; B.talents.improvedShadowBolt = st.tal; S.build = B;
        n++;
        var a1 = WL.ruleCond(node, S, B), a2 = WL.ruleCond(line.when || null, S, B);
        if (a1 !== a2) { bad.push('node ' + ni + ' ' + WL.condText(node, B) + ': ' + a1 + ' vs ' + a2 + ' as ' + WL.condText(line.when, B)); break; }
      }
    });
    T.ok(n > 10000, nodes.length + ' conditions × 300 states');
    T.eq(bad.slice(0, 4).join(' | '), '', 'exported, edited there (no marker) and read back: the same answer in every state, and no warning');

    T.group('a build without lossy parts: the same fights without the markers');
    var L = sheet('destro_incin_succ'), c = cfgOf();
    L.rotation = ['curseOfElements', 'rule:0', 'rule:1', 'conflagrate', 'searingPainExecute', 'lifeTapBelow', 'incinerate'];
    L.rules = [{ spell: 'immolate', when: { t: 'all', c: [{ t: 'dot', spell: 'immolate', op: '<=', v: { cast: 'immolate' } }, { t: 'fight', what: 'remaining', op: '>', v: 15 }] } },
      { spell: 'corruption', when: { t: 'all', c: [{ t: 'dot', spell: 'corruption', op: '<=', v: 0 }, { t: 'var', name: 'Long' }] } }];
    L.vars = { Long: { cond: { t: 'fight', what: 'remaining', op: '>', v: 18 } } }; L.params = { lifeTapBelow: { pct: 45, sec: 30 } };
    var e2 = WL.aplExport(L), im4 = WL.aplImport(strip(e2.text)), tb4 = WL.aplToBuild(im4.lines, L);
    T.eq(e2.warnings.join(' | '), '', 'nothing lossy in the export');
    T.eq(tb4.errors.join(' | '), '', 'the build read back is valid');
    T.eq(tb4.build.rotation.filter(function (a) { return !/^rule:/.test(a); }).join(','), 'curseOfElements,conflagrate,searingPainExecute,lifeTapBelow,incinerate', 'the simple actions are matched again (with Life Tap\'s 45 / 30)');
    var diff = [];
    [c, cfgOf(function (x) { x.fight.targets = 3; x.fight.multiDot = true; }), cfgOf(function (x) { x.options.useCurseOfElements = false; })].forEach(function (cc, ci) {
      [1, 2, 3].forEach(function (sd) { var d0 = dps(L, cc, sd, 300), d1 = dps(tb4.build, cc, sd, 300); if (Math.abs(d0 - d1) > 1e-9) diff.push('settings ' + ci + ' seed ' + sd + ': ' + d0.toFixed(2) + ' vs ' + d1.toFixed(2)); });
    });
    T.eq(diff.join(' | '), '', 'the same DPS in 9 fights (3 settings × 3 seeds, 300 s)');
  });

  T.run('round 278: every lossy case is warned', function () {
    var w = function (k, f) { var b = sheet(k); if (f) f(b); return WL.aplExport(b); }, has = function (e, re) { return e.warnings.some(function (x) { return re.test(x); }); };
    var sd = w('demo_pact_succ_sb');
    T.ok(has(sd, /the rest of the fight needs more mana than you have" is exported as "the first 6 s, or mana < [\d.]+ × seconds left"/) && has(sd, /"free mana is ready".*has no equivalent/), 'Life Tap when needed: "needs more mana" as a measured mana rate (round 281), "free mana" left out, warned');
    T.ok(has(sd, /exported as "fight time left < Shadow Bolt cast time"/), 'Death Coil finisher: approximated, warned');
    T.ok(has(sd, /Corruption needs a recast": the end-of-fight check .* exported as "the cast and 2 ticks still fit"/) && has(sd, /Bane of Agony still pays off.*"at least 12 s left"/), 'DoT recast / pays off: approximated, warned');
    T.ok(has(sd, /autocast other cooldowns" \(no on-use trinket in the gear builder\): there it also pops racials and potions/), 'Activate trinket with no on-use trinket in the gear builder → autocast other cooldowns, warned');
    var fd = w('demo_pact_fire');
    T.ok(has(fd, /Life Tap to feed the pet.*is exported as "Imp's mana < 230 \(2 × Firebolt\)/) && /"currentMana":\{"sourceUnit":\{"type":"Pet","owner":\{"type":"Self"\}\}\}/.test(fd.text), 'Life Tap for the pet: the Imp\'s mana < 2 Firebolts (round 281), warned');
    T.ok(has(w('wrack_ds'), /5-second rule\) has no equivalent/), 'the 5-second rule (Wrack DS): warned');
    var md = w('destro_incin_succ', function (b) { b.rotation = ['multiDot', 'shadowBoltSpread', 'shadowburn', 'incinerate']; b.timeline = [{ t: 0, k: 'immolate' }]; });
    T.ok(has(md, /multi-target DoTs are a Fight setting here\) — kept as a hidden row/) && has(md, /it picks its own target/) && has(md, /Soul Shards > 0/) && has(md, /fight timeline \(1 spells/), 'multi-DoT, Shadow Bolt an extra target, Soul Shards, the timeline: warned');
    var pp = w('destro_incin_succ', function (b) { b.rotation = ['rule:0', 'incinerate']; b.rules = [{ spell: 'searingPain', when: { t: 'any', c: [{ t: 'aura', aura: 'spPotion', op: '>', v: 0 }, { t: 'fsr', op: '>', v: 5 }] } }]; });
    T.ok(has(pp, /Spellblasting|that buff has no aura id there/) && has(pp, /the whole "or" is left out/) && has(pp, /nothing of its condition has an equivalent there/) && !/"spellId":17923/.test(pp.text), 'an "or" with a part that has no equivalent: the whole "or" goes, the row with it (warned)');
  });

  T.run('round 278: import of the rotation text (names, expressions, when blocks, groups, variables, defs, raw rows)', function () {
    var t = ['// a comment', 'siml 1', 'spec warlock', '',
      'var ${Doom tick} = dot(bane_of_doom).base_duration', 'var $low = current_mana_percent < 35%',
      'def short(x) = dot(x).remaining_time < 2s', '',
      'prepull:', '  -1.5s cast shadow_bolt_rank9', '',
      'priority:',
      '  autocast_other_cooldowns',
      '  cast curse_of_the_elements if not target.aura(curse_of_the_elements).is_active and remaining_time > 10s',
      '  cast bane_of_doom on target1 if remaining_time > $doom_tick',
      '  /// Shadow Trance', '  cast shadow_bolt_rank10 if aura(shadow_trance).is_active(include_reaction_time=true)',
      '  cast immolate if short(immolate) and target.current_health_percent > 20%',
      '  when number_targets == 1 and not spell(searing_pain).is_casting:',
      '    cast corruption',
      '        if not dot(corruption).is_active',
      '        and (remaining_time >= 18s or current_time < 500ms)',
      '    # cast drain_soul',
      '  group "Burst" with %t = 4s',
      '  cast summon_imp', '  cast item.major_spellblasting_potion', '  cast curse_of_recklessness',
      '  cast searing_pain if is_execute_phase(e35)',
      '  cast life_tap if $low and remaining_time > 30s',
      '  `{"action":{"condition":{"cmp":{"op":"OpLe","lhs":{"spellTimeToReady":{"spellId":{"spellId":17924}}},"rhs":{"const":{"val":"0"}}}},"castSpell":{"spellId":{"spellId":17924}}}}`',
      '  `{"castSpell":{"spellId":{"spellId":17926}}}` if spell(death_coil).cast_time > remaining_time',
      '  cast shadow_bolt_rank9', '  cast life_tap', '',
      'group "Burst":', '  cast conflagrate if dot(immolate).remaining_time > %t', '  cast berserking'].join('\n');
    var im = WL.aplImport(t), b = sheet('destro_incin_succ');
    var txt = im.lines.map(function (l) { return l.act || l.spell + (l.when ? ' if ' + WL.condText(l.when, b) : ''); });
    T.eq(im.error, null, 'no error');
    T.eq(txt.join(' | '), ['curseOfElements if (Curse of the Elements on the boss time left <= 0 s and fight time left > 10 s)', 'baneOfDoom if fight time left > 60 s', 'shadowBolt if Shadow Trance (Nightfall) time left > 0 s',
      'immolate if (Immolate time left < 2 s and boss health % > 20)', 'corruption if (Corruption time left <= 0 s and (fight time left >= 18 s or fight time gone < 0.5 s))', 'conflagrate if Immolate time left > 4 s',
      'searingPain if boss health % < the execute %', 'lifeTap if (mana % < 35 and fight time left > 30 s)', 'soulFire if Soul Fire cooldown <= 0 s', 'deathCoil if fight time left < Death Coil cast time s', 'shadowBolt'].join(' | '),
      'names, units, accessors with arguments, a def with a parameter, variables by name and by identifier, a when block with continuation lines, a group with a placeholder, the execute phase, raw rows and a raw action with "if"');
    var all = im.warnings.concat(im.notes).join(' | ');
    T.ok(/Prepull rows are left out/.test(all) && /summon_imp.*pets are a build setting/.test(all) && /item\.major_spellblasting_potion.*settings here/.test(all) && /curse_of_recklessness/.test(all) && /berserking.*racials/.test(all) && /Hidden rows are left out/.test(all) && /Life Tap under the filler is left out/.test(all) && /Cooldown rows/.test(all),
      'warned / noted: prepull, a pet summon, an item, another curse, a racial, the hidden row, the Life Tap under the filler, the cooldowns row');
    var tb = WL.aplToBuild(im.lines, b);
    T.eq(tb.errors.join(' | '), '', 'it becomes a valid build');
    T.eq(WL.aplImport('siml 1\nspec warlock\npriority:\n  cast corruption if dot(corruption).remaining_time < && 2s\n  cast shadow_bolt_rank9').lines.map(function (l) { return l.spell; }).join(), 'shadowBolt', 'a row that cannot be read is left out (with a warning), the rest is read');
    T.ok(/not an APL rotation/.test(WL.aplImport('hello').error) && /Paste/.test(WL.aplImport('  ').error) && /not valid JSON/.test(WL.aplImport('{x').error) && /No rotation/.test(WL.aplImport('{"player":{}}').error), 'errors: not APL text, empty, broken JSON, JSON without a rotation');
  });

  T.run('round 278: import of the JSON forms and of the other sim\'s presets', function () {
    var row = { action: { condition: { auraIsActive: { auraId: { spellId: 17941 } } }, castSpell: { spellId: { spellId: 11661, rank: 9 } } } }, fill = { action: { castSpell: { spellId: { spellId: 11661 } } } };
    var R = { type: 'TypeAPL', priorityList: [row, fill] }, forms = [{ apiVersion: 2, player: { name: 'x', rotation: R } }, { rotation: R }, R, [row, fill], [row.action, fill.action]];
    T.ok(forms.every(function (f) { var im = WL.aplImport(JSON.stringify(f)); return im.lines.length === 2 && im.lines[0].spell === 'shadowBolt' && im.lines[0].when.aura === 'shadowTrance' && !im.lines[1].when; }), 'IndividualSimSettings, Player, APLRotation, a row list, an action list: all read (ranks ignored)');
    var cl = WL.aplImport(JSON.stringify({ kind: 'action', value: row }));
    T.ok(cl.lines.length === 1 && cl.lines[0].spell === 'shadowBolt', 'their row clipboard ({ kind: "action", value })');
    T.group('presets');
    var sm = WL.aplImport(JSON.stringify(FIX_JSON)), smb = WL.aplToBuild(sm.lines, sheet('sm_ruin_classic'));
    T.eq(smb.errors.join(' | '), '', 'SM Ruin preset (JSON): a valid build');
    T.ok(smb.build.rotation.indexOf('shadowTrance') >= 0 && smb.build.rotation.indexOf('lifeTapBelow') >= 0 && smb.build.params.lifeTapBelow.pct === 30 && smb.build.params.lifeTapBelow.sec === 60 && smb.build.rotation[smb.build.rotation.length - 1] === 'shadowBolt',
      'its Nightfall bolt, Life Tap below 30% with more than 60 s left and the Shadow Bolt filler become this sim\'s actions');
    T.ok(sm.warnings.some(function (w) { return /amplify_curse/.test(w); }) && sm.warnings.some(function (w) { return /spell_expected_dpet/.test(w); }) && sm.notes.some(function (n) { return /Multi-DoT rows are read for the boss/.test(n); }), 'warned: Amplify Curse, expected damage per time; noted: multi-DoT rows read for the boss');
    var lv = WL.aplImport(FIX_TEXT), lvb = WL.aplToBuild(lv.lines, sheet('demo_pact_fire'));
    T.eq(lvb.errors.join(' | '), '', 'Demo Fire Brand (their rotation text, live export): a valid build');
    T.ok(lvb.build.rotation.indexOf('soulFire') >= 0 && lvb.build.rotation.indexOf('lifeTapBelow') >= 0 && lvb.build.rotation[lvb.build.rotation.length - 1] === 'searingPain' && lv.lines.some(function (l) { return l.spell === 'baneOfDoom'; }),
      'Soul Fire on Decimation, Life Tap below 35%, Bane of Doom, the Searing Pain filler');
    T.ok(['talisman_of_ephemeral_power', 'major_spellblasting_potion', 'eureka', 'blood_fury', 'berserking'].every(function (k) { return lv.warnings.some(function (w) { return w.indexOf(k) >= 0; }); }) && lv.notes.some(function (n) { return /number_targets is read as 1/.test(n); }),
      'items, Eureka and racials named in the warnings; number_targets read as 1');
    T.ok(isFinite(dps(smb.build, cfgOf(), 1)) && isFinite(dps(lvb.build, cfgOf(), 1)), 'both simulate');
  });

  T.run('round 278: lines → a build', function () {
    var b = sheet('demo_pact_succ_sb');
    var r = WL.aplToBuild([{ spell: 'incinerate' }, { spell: 'corruption', when: { t: 'dot', spell: 'corruption', op: '<=', v: 0 } }], b);
    T.ok(r.warnings.some(function (w) { return /Incinerate needs the Incinerate talent/.test(w); }) && r.warnings.some(function (w) { return /No row is always cast/.test(w); }) && r.build.rotation[r.build.rotation.length - 1] === 'shadowBolt' && !r.errors.length,
      'a spell the build lacks the talent for is left out; no filler → the build\'s own (Shadow Bolt)');
    var L = WL.aplLines('bane', b), r2 = WL.aplToBuild(L.concat([{ spell: 'shadowBolt' }]), b);
    T.eq(r2.build.rotation.join(), 'bane,shadowBolt', 'the two lines of "Bane of Doom, else Bane of Agony" become that action');
    T.ok(r2.build.talents !== b.talents && JSON.stringify(r2.build.talents) === JSON.stringify(b.talents) && r2.build.pet === b.pet, 'a copy of the build: talents and pet kept');
    var before = JSON.stringify(WL.BUILDS.filter(function (x) { return !x.custom; }));
    WL.BUILDS.filter(function (x) { return !x.custom; }).forEach(function (x) { WL.aplToBuild(WL.aplImport(WL.aplExport(x).text).lines, x); });
    T.eq(JSON.stringify(WL.BUILDS.filter(function (x) { return !x.custom; })) === before, true, 'the built-in builds are not changed by export / import');
  });

  T.run('round 278: the buttons (build editor, Talents & rotation) and the dialog', function () {
    var h = src('../index.html'), a = src('../app/app.js'), io = src('../engine/apl-io.js'), me = src('test-round278.js'), name = new RegExp('wow' + 'sims|wow ' + 'sims', 'i');
    if (!h || !a) { T.warn('page source', 'could not read index.html / app.js (file:// without XHR)'); return; }
    T.ok(/id="edAplOut"[^>]*>Export APL</.test(h) && /id="edAplIn"[^>]*>Import APL</.test(h), 'build editor: "Export APL" and "Import APL" buttons');
    T.ok(/<dialog id="aplDlg"/.test(h) && /id="aplText"/.test(h) && /data-aplfmt="json"/.test(h) && /id="aplCopy"/.test(h) && /id="aplDo"/.test(h) && /id="aplClose"/.test(h), 'one dialog: the text, APL text / JSON, Copy, Import, Close');
    T.ok(/another Forever sim uses — paste the export into that sim's rotation import, or paste its export here\. Cooldowns, racials and potions are settings here, not rotation lines\./.test(h), 'the help text under the buttons');
    var i1 = h.indexOf('src="engine/custom-builds.js"'), i2 = h.indexOf('src="engine/apl-io.js"'), i3 = h.indexOf('src="app/app.js"');
    T.ok(i1 > 0 && i2 > i1 && i3 > i2, 'engine/apl-io.js is loaded after custom-builds.js, before app.js');
    T.ok(/data-aplout="' \+ esc\(b\.key\) \+ '"[^>]*>Export APL</.test(a) && /data-aplin="' \+ esc\(b\.key\) \+ '"[^>]*>Import APL</.test(a), 'Talents & rotation → Rotation priority: "Export APL" / "Import APL"');
    T.ok(/WL\.aplExport\(b, c\)/.test(a) && /WL\.aplImport\(\$\('aplText'\)\.value/.test(a) && /WL\.aplToBuild\(r\.lines, ed\.b\)/.test(a) && /function aplEntry\(r, others\) \{ return WL\.aplEntry\(ed\.b, r, others\); \}/.test(a), 'the handlers call WL.aplExport / WL.aplImport / WL.aplToBuild; the editor\'s APL lines use WL.aplEntry');
    T.ok(/#edAplOut[\s\S]{0,80}aplExportOpen\(b, cfg/.test(a) && /button\[data-aplin\][\s\S]{0,120}aplImportOpen/.test(a) && /editFromResults|edStart\(src\)/.test(a), 'editor export: the build in the editor; a build\'s import opens a copy in the editor');
    T.ok(/navigator\.clipboard\.writeText\(box\.value\)[\s\S]{0,160}fb\)/.test(a) && /press Ctrl\+C/.test(a), 'Copy with the select + Ctrl+C fallback');
    T.ok(!/apl-io/.test(src('../engine/worker.js')) && !/apl-io/.test(src('../tools/load-wl.js')), 'not part of the simulation (worker, tools)');
    T.ok(!name.test(h) && !name.test(a) && !name.test(io) && !name.test(me), 'the other sim is not named in the page, the app, the engine file or this test');
  });
})();
