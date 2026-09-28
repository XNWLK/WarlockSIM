// Test page only (NOT loaded by the sim or tools/explore.html).
// The hand calculations in the test files were written for the round-2 reference gear
// (700 SP, 200 Int, 80 Spi, 200 Sta, 0 MP5). Round 13 changed the shipped defaults (500 SP + Classic pre-raid BiS
// Int/Spi/Sta/MP5, A58), so the tests pin the reference gear here and check the shipped values separately.
window.WL = window.WL || {};
WL.SHIPPED_GEAR = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG.gear));
(function (g) { g.sp = 700; g.int = 200; g.spi = 80; g.sta = 200; g.mp5 = 0; })(WL.DEFAULT_CONFIG.gear);
// Round 16 changed the pet defaults (pet SP 100% → 15%, Succubus melee 40 → 100 DPS); the pet tests' worked numbers use the old ones.
var sm = WL.DEFAULT_CONFIG.pets.succubus.melee;
WL.SHIPPED_PETS = { petSpPct: WL.DEFAULT_CONFIG.petSpPct, succBaseDps: sm.baseDps, succApPerSp: sm.apPerSp, succCrit: sm.critPct, succInherit: sm.inheritSpellCrit };
WL.DEFAULT_CONFIG.petSpPct = 100; sm.baseDps = 40; sm.apPerSp = 0.57; sm.critPct = 5; sm.inheritSpellCrit = false;   // round-2 pet values of the worked tests
// Round 60 (user): 7 raid buffs and 2 more boss debuffs are on by default. The worked tests were written with every raid
// buff off and only Sunder Armor + Faerie Fire on, so they keep that; the shipped defaults are checked below.
WL.SHIPPED_ON = { buffs: {}, debuffs: {} };
['buffs', 'debuffs'].forEach(function (g) {
  Object.keys(WL.DEFAULT_CONFIG[g]).forEach(function (k) { WL.SHIPPED_ON[g][k] = !!WL.DEFAULT_CONFIG[g][k].on; });
});
WL.ROUND60_ON = { buffs: ['arcaneIntellect', 'markOfTheWild', 'fortitude', 'divineSpirit', 'blessingOfKings', 'blessingOfWisdom', 'moonkinAura'],
                  debuffs: ['curseOfRecklessness', 'judgementOfWisdom'] };
['buffs', 'debuffs'].forEach(function (g) { WL.ROUND60_ON[g].forEach(function (k) { WL.DEFAULT_CONFIG[g][k].on = false; }); });

T.run('shipped default gear (round 13)', function () {
  T.group('defaults = 500 SP + Classic pre-raid BiS gear (A58)');
  var g = WL.SHIPPED_GEAR;
  T.eq([g.sp, g.hitPct, g.critPct, g.hastePct, g.pierce].join('/'), '500/5/10/0/0', 'SP 500, hit 5%, crit 10%, haste 0, pierce 0');
  T.eq([g.int, g.spi, g.sta, g.mp5].join('/'), '148/54/160/0', 'Int 148 / Spi 54 (user, round 37) / Sta 160 / MP5 0 (user, round 39)');
  // Round 13 derivation of the old defaults (Classic pre-raid BiS item sums Int 48 / Spi 4), kept as a record:
  // the Wowhead gear planner (Gnome, 9/21/21, Demonic Embrace 5/5) shows Int 169 / Spi 113 / Sta 179.
  T.near((110 + 3 + 48) * 1.05, 169, 0.5, 'planner Int 169 = (110 + 3 Gnome + 48) × 1.05 Classic Expansive Mind (old default 48)');
  T.near((115 + 0 + 4) * 0.95, 113, 0.5, 'planner Spi 113 = (115 + 4) × 0.95 Classic Demonic Embrace (old default 4)');
  T.near((65 - 1 + 92) * 1.15, 179, 0.5, 'planner Sta 179 = (65 − 1 Gnome + 92) × 1.15 Demonic Embrace (old default 92)');
  T.group('shipped pet defaults (round 16, pet scaling measured in round 31)');
  T.eq(WL.SHIPPED_PETS.petSpPct, 10, 'pet spell power = 10% of the Warlock\'s (user, measured in Forever: 10 SP = 1 pet SP; was 15)');
  // Round 17: Season of Discovery Succubus: (95 + 131) / 2 / 2.0 + (129 × 2 − 20) / 14
  T.near(WL.SHIPPED_PETS.succBaseDps, (95 + 131) / 2 / 2.0 + (129 * 2 - 20) / 14, 0.05, 'Succubus melee base = 56.5 weapon + 17.0 from own AP = 73.5 DPS (SoD)');
  T.near(WL.SHIPPED_PETS.succApPerSp, 1 / 6, 0.0001, 'Succubus AP = 1/6 of the Warlock\'s spell power (user, measured: 6 SP = 1 pet AP; Imp tooltip 17%; was 0.565)');
  T.near(WL.SHIPPED_PETS.succCrit, 3.2685 + 85 * 0.05, 0.01, 'Succubus own melee crit 7.52% (SoD base: 3.27% + 85 Agi × 0.05)');
  T.eq(WL.SHIPPED_PETS.succInherit, true, 'Succubus melee also inherits 100% of your spell crit (user, round 32; was your melee crit 4.5%)');
  T.ok(!WL.CONSUMABLES.darkIronBomb, 'Dark Iron Bomb removed (data error)');

  T.group('shipped buff & debuff defaults (round 60, user)');
  var onB = Object.keys(WL.SHIPPED_ON.buffs).filter(function (k) { return WL.SHIPPED_ON.buffs[k]; }).sort().join(',');
  var onD = Object.keys(WL.SHIPPED_ON.debuffs).filter(function (k) { return WL.SHIPPED_ON.debuffs[k]; }).sort().join(',');
  T.eq(onB, 'arcaneIntellect,blessingOfKings,blessingOfWisdom,divineSpirit,fortitude,markOfTheWild,moonkinAura',
    'raid buffs on: Arcane Intellect, Mark of the Wild, Fortitude, Divine Spirit, Kings, Wisdom, Moonkin aura (rest off)');
  T.eq(onD, 'faerieFire,judgementOfWisdom,sunderArmor',
    'boss debuffs on: Sunder Armor, Faerie Fire, Judgement of Wisdom (round 68: Curse of Recklessness off — it does not stack with Faerie Fire; Expose Armor and the other Warlock\'s CoE off)');
  // Hand calculation with the shipped gear and buffs, Human, sword, no talents (stats window "Total" column):
  var cs = JSON.parse(JSON.stringify(WL.DEFAULT_CONFIG));
  cs.gear = JSON.parse(JSON.stringify(WL.SHIPPED_GEAR));
  ['buffs', 'debuffs'].forEach(function (g) { Object.keys(cs[g]).forEach(function (k) { cs[g][k].on = WL.SHIPPED_ON[g][k]; }); });
  var st = WL.computeStats({ key: 'x', talents: {}, pet: null, sacrifice: null, oil: 'none', rotation: ['shadowBolt'] }, 'human', cs);
  var int = (110 + 148 + 31 + 16) * 1.10, spi = (115 + 54 + 16 + 40) * 1.05 * 1.10, sta = (65 + 160 + 16 + 70) * 1.10;
  T.near(st.int, int, 1e-9, 'Int = (110 + 148 + 31 Arcane Intellect + 16 Mark) × 1.10 Kings = ' + int.toFixed(1));
  T.near(st.spi, spi, 1e-9, 'Spirit = (115 + 54 + 16 Mark + 40 Divine Spirit) × 1.05 Human Spirit × 1.10 Kings = ' + spi.toFixed(3));
  T.near(st.sta, sta, 1e-9, 'Stamina = (65 + 160 + 16 Mark + 70 Fortitude) × 1.10 Kings = ' + sta.toFixed(1));
  T.near(st.critPct, 10 + 2 + 3 + (int - 258) / 60, 1e-9, 'crit = 10 sheet + 2 Sword + 3 Moonkin + (Int above the sheet ' + (int - 258).toFixed(1) + ') / 60');
  T.near(st.maxMana, 1373 + 20 + 15 * (int - 20), 1e-9, 'max mana = 1373 + 20 + 15 × (Int − 20)');
  T.eq(st.mp5, 40, 'MP5 40 (Blessing of Wisdom)');
  T.eq(WL.bossArmor(cs), 3731 - 2250 - 505, 'boss armor 976 = 3731 − Sunder 2250 − Faerie Fire 505 (round 68; was 471 with Curse of Recklessness stacking)');
});
