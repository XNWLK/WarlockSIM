// Round 218 tests (user: "drop immolate from shadow demo and use shadow wrath for wrack and have omnicast as the alternative"):
// Shadow Demo's priority without Immolate; Wrack DS in Master's Boots of Shadow Wrath (+30 Shadow), a world drop.
(function () {
  T.run('round 218: Shadow Demo without Immolate, Wrack DS boots', function () {
    var SD = WL.BUILDS.filter(function (b) { return b.key === 'demo_pact_succ_sb'; })[0];
    T.group('Shadow Demo');
    T.ok(SD && SD.rotation.indexOf('immolate') < 0, 'Shadow Demo: no Immolate in the priority');
    T.eq(SD.rotation.filter(function (a) { return a !== 'activateTrinket'; }).join(), 'deathCoilFinisher,bane,curseOfElements,searingPainBrand,corruption,lifeTapNeed,shadowBolt', 'Shadow Demo: the rest of the priority unchanged (round 219: Activate trinket left out of the check)');
    T.ok(WL.BUILDS.filter(function (b) { return b.key !== 'demo_pact_succ_sb'; }).every(function (b) { return b.rotation.indexOf('immolate') >= 0 || b.key === 'wrack_ds'; }),
      'the other Immolate builds keep it');
    T.group('Wrack DS boots');
    var B = WL.ITEMS[10247], W = WL.PRE_RAID_BIS.wrack_ds;
    T.ok(B && B.name === "Master's Boots of Shadow Wrath" && B.slot === 'feet' && B.stats.shadowSp === 30 && Object.keys(B.stats).length === 1,
      "Master's Boots: kept as the +30 Shadow Wrath roll, nothing else");
    T.ok(B.from === 'World drop' && !B.raid && (B.phase || 1) === 1, "Master's Boots: a world drop, not a raid item, Phase 1");
    T.eq(W.feet, 10247, "Wrack DS feet: Master's Boots of Shadow Wrath");
    T.ok(Object.keys(WL.PRE_RAID_BIS).every(function (k) { return k === 'wrack_ds' || WL.PRE_RAID_BIS[k].feet === 11822; }), 'the other builds keep Omnicast Boots');
    var M = WL.ITEMS[10255];
    T.ok(M && M.name === "Master's Belt of Shadow Wrath" && M.slot === 'waist' && M.stats.shadowSp === 30 && Object.keys(M.stats).length === 1 && M.from === 'World drop',
      "Master's Belt: the +30 Shadow Wrath roll, a world drop");
    T.eq(W.waist, 10255, "Wrack DS waist: Master's Belt of Shadow Wrath (user)");
    if (!WL.ITEM_TIPS) { T.ok(true, 'item tooltips not loaded on this page'); return; }
    var t = WL.ITEM_TIPS[10247];
    T.ok(t && /\+30 Shadow Spell Damage/.test(t) && /56 Armor/.test(t) && /Requires Level 58/.test(t), "Master's Boots tooltip shows the Shadow Wrath roll");
    T.ok(/\+30 Shadow Spell Damage/.test(WL.ITEM_TIPS[10255] || '') && /45 Armor/.test(WL.ITEM_TIPS[10255]), "Master's Belt tooltip shows the Shadow Wrath roll");
  });
})();
