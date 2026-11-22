// Content phases of the enchants (round 213, user: "you're gonna have to make educated guesses on which enchants are
// available, so add an enchant tab to the gear artifact and we can constantly review it … use your guesses for now").
// WL.ENCHANT_PHASE_GUESS: every enchant of data/item-db.js → phase (1–6, 9 = not in the game); the user's own word where
// noted, else a guess (classic order; the Forever-made 76xx / 79xx enchants later than Phase 1, since the user's Phase 1 chest
// enchant is +3 stats and not Living Stats). WL.ENCHANT_PHASE_SET: the user's review (the Enchants tab of the pre-raid page,
// https://claude.ai/artifact/QwERbC7KnhTkk9f9RVKED1) — it wins. The gear builder's Phase choice filters enchants with it.
window.WL = window.WL || {};
WL.ENCHANT_PHASE_GUESS = {
  15: 1,    // Stamina +1 and Armor +8 (chest, hands, legs, feet) — armor kit, guess
  24: 1,    // Intellect +2 (chest) — classic enchanting, guess
  41: 1,    // Stamina +2 (chest, wrist) — classic enchanting, guess
  66: 1,    // Stamina +3 (wrist, feet) — classic enchanting, guess
  242: 1,   // Stamina +3 (chest) — classic enchanting, guess
  243: 1,   // Spirit +3 (wrist) — classic enchanting, guess
  246: 1,   // Intellect +3 (chest, wrist) — classic enchanting, guess
  254: 1,   // Stamina +4 (chest, wrist, feet) — classic enchanting, guess
  723: 1,   // Intellect +5 (mainHand) — classic enchanting, guess
  843: 1,   // Intellect +4 (chest) — classic enchanting, guess
  847: 1,   // All Stats +1 (chest) — classic enchanting, guess
  850: 1,   // Stamina +6 (chest) — classic enchanting, guess
  851: 1,   // Spirit +5 (wrist, feet, mainHand) — classic enchanting, guess
  852: 1,   // Stamina +5 (wrist, feet) — classic enchanting, guess
  857: 1,   // Intellect +6 (chest) — classic enchanting, guess
  866: 1,   // All Stats +2 (chest) — classic enchanting, guess
  905: 1,   // Intellect +5 (wrist) — classic enchanting, guess
  907: 1,   // Spirit +7 (wrist) — classic enchanting, guess
  908: 1,   // Stamina +8 (chest) — classic enchanting, guess
  913: 1,   // Intellect +8 (chest) — classic enchanting, guess
  928: 1,   // All Stats +3 (chest) — user: chest 3 stats
  929: 1,   // Stamina +7 (wrist, feet) — classic enchanting, guess
  931: 1,   // Haste +1% (hands) — user: gloves haste
  1507: 1,  // Stamina +8 (head, legs) — Phase 1: user (round 225: "put +8 arcanums ins, +4 stats, bracers 9 int")
  1509: 1,  // Intellect +8 (head, legs) — Phase 1: user (round 225: "put +8 arcanums ins, +4 stats, bracers 9 int")
  1510: 1,  // Spirit +8 (head, legs) — Phase 1: user (round 225: "put +8 arcanums ins, +4 stats, bracers 9 int")
  1883: 1,  // Intellect +7 (wrist) — classic enchanting, guess
  1884: 1,  // Spirit +9 (wrist) — classic enchanting, guess
  1886: 1,  // Stamina +9 (wrist) — classic enchanting, guess
  1891: 1,  // All Stats +4 (chest) — Phase 1: user (round 225: "put +8 arcanums ins, +4 stats, bracers 9 int")
  1892: 2,  // +10 Stamina (chest) — not in the classic list (Forever): later, guess
  1893: 2,  // Intellect +10 (chest) — not in the classic list (Forever): later, guess
  1901: 1,  // Intellect +9 (wrist) — Phase 1: user (round 225: "put +8 arcanums ins, +4 stats, bracers 9 int")
  1903: 1,  // Spirit +9 (mainHand) — classic enchanting, guess
  1904: 1,  // Intellect +9 (mainHand) — classic enchanting, guess
  2504: 2,  // Spell Power +30 (mainHand) — not Phase 1: user (round 245: "30 spellpower isn't available yet.")
  2505: 1,  // Healing Spells +55 (mainHand) — classic enchanting, guess
  2544: 1,  // Healing and Spell Damage +8 (head, legs) — user: head and legs 8 spell power in Phase 1
  2565: 5,  // Mana Regen 4 per 5 sec. (wrist) — bracer Mana Regeneration: Cenarion Circle
  2566: 5,  // Healing Spells +24 (wrist) — bracer Healing Power: Cenarion Circle
  2567: 1,  // Spirit +22 (mainHand) — classic enchanting, guess
  2568: 1,  // Intellect +22 (mainHand) — classic enchanting, guess
  2589: 4,  // Healing and Spell Damage +18/Stamina +10 (head, legs) — Hoodoo Hex: Zul'Gurub
  2605: 4,  // +18 Spell Damage and Healing (shoulder) — Zandalar Signet of Mojo: Zul'Gurub
  2614: 5,  // Shadow Damage +20 (hands) — gloves Shadow Power: Ahn'Qiraj in the classic order
  2616: 5,  // Fire Damage +20 (hands) — gloves Fire Power: Ahn'Qiraj in the classic order
  2617: 5,  // Healing Spells +35/Damage Spells +12 (hands) — gloves Healing Power: Ahn'Qiraj in the classic order
  2715: 6,  // Healing +31 and 5 mana per 5 sec. (shoulder) — Resilience of the Scourge: Naxxramas
  2716: 6,  // Stamina +16 and Armor +100 (shoulder) — Fortitude of the Scourge: Naxxramas
  2721: 6,  // Spell Damage +15 and +1% Spell Critical Strike (shoulder) — Power of the Scourge: Naxxramas
  7645: 2,  // Living Stats (chest) — Living Stats (+4): the user has +3 in Phase 1, so this comes later
  7655: 1,  // +12 Spell Power (wrist) — the lower rank of +16 Spell Power, which the user has in Phase 1 (round 214): guess
  7659: 1,  // +9 Intellect (offHand) — Phase 1: the user put it on every off hand (round 216)
  7660: 1,  // +12 Spirit (offHand) — round 225: the same recipe set as +9 Intellect and +65 Spell Power (spells 1219577–1219580), guess
  7661: 1,  // +6 Intellect and +5 Spirit (offHand) — round 225: the same recipe set as +9 Intellect and +65 Spell Power (spells 1219577–1219580), guess
  7662: 1,  // +65 Spell Power (mainHand) — Phase 1: user (round 225: "i think the 65sp 2h enchant is missing in the sim")
  7665: 1,  // +16 Spell Power (wrist) — Phase 1: the user put it on the Pre-BiS bracers (round 214)
  7941: 2,  // Grand Arcanist (mainHand) — Grand Arcanist (Forever): later, guess
  7942: 2,  // Grand Sorcerer (mainHand) — Grand Sorcerer (Forever): later, guess
  8203: 1,  // Spirit +4 (wrist, feet) — classic enchanting, guess
  8208: 1,  // Healing Spells +8, Damage Spells +3 (wrist) — classic enchanting, guess
  8209: 1,  // Healing Spells +16, Damage Spells +6 (wrist) — wrist pick (guess): the same Forever set as the neck and Revelation (82xx), which the user has in Phase 1
  8211: 1,  // Spell Power +55 (mainHand) — classic enchanting, guess
  8212: 1,  // Healing Spells +100, Damage Spells +34 (mainHand) — classic enchanting, guess
  8216: 1,  // Insight (mainHand) — classic enchanting, guess
  8217: 1,  // Revelation (mainHand) — user: weapon Revelation
  7210: 1,  // Dismantle (mainHand) — round 241 item sync: scroll "Enchant Weapon - Dismantle" (item 273590), guess
  8218: 1,  // +6 Spell Power (neck) — user: neck 6 spell power
  8219: 1,  // Healing Spells +11, Damage Spells +4 (neck) — classic enchanting, guess
  8481: 1,  // Stamina +2 and Armor +16 (chest, hands, legs, feet) — armor kit, guess
  8482: 1,  // Spell Power +2 and Armor +16 (chest, hands, legs, feet) — armor kit, guess
  8484: 1,  // Stamina +3 and Armor +24 (chest, hands, legs, feet) — armor kit, guess
  8485: 1,  // Spell Power +4 and Armor +24 (chest, hands, legs, feet) — armor kit, guess
  8487: 1,  // Stamina +4 and Armor +32 (chest, hands, legs, feet) — armor kit, guess
  8489: 1,  // Spell Power +5 and Armor +32 (chest, hands, legs, feet) — armor kit, guess
  8490: 1,  // Stamina +5 and Armor +40 (chest, hands, legs, feet) — armor kit, guess
  8492: 1,  // Spell Power +6 and Armor +40 (chest, hands, legs, feet) — Phase 1: the user put it on the Pre-BiS chest (round 214)
  8719: 1,  // Defense +4 and Stamina +10 (chest, hands, legs, feet) — armor kit, guess
  8734: 1,  // Intellect +3 (wrist) — classic enchanting, guess
};
WL.ENCHANT_PHASE_SET = {};
WL.enchantPhase = function (id) { return WL.ENCHANT_PHASE_SET[id] || WL.ENCHANT_PHASE_GUESS[id] || 1; };
