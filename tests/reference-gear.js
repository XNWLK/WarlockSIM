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
});
