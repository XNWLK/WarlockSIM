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
  1507: 2,  // Stamina +8 (head, legs) — Lesser Arcanum of Voracity: Dire Maul
  1509: 2,  // Intellect +8 (head, legs) — Lesser Arcanum of Voracity: Dire Maul
  1510: 2,  // Spirit +8 (head, legs) — Lesser Arcanum of Voracity: Dire Maul
  1883: 1,  // Intellect +7 (wrist) — classic enchanting, guess
  1884: 1,  // Spirit +9 (wrist) — classic enchanting, guess
  1886: 1,  // Stamina +9 (wrist) — classic enchanting, guess
  1891: 2,  // All Stats +4 (chest) — chest +4 stats: the user has +3 in Phase 1, so +4 comes later
  1892: 2,  // +10 Stamina (chest) — not in the classic list (Forever): later, guess
  1893: 2,  // Intellect +10 (chest) — not in the classic list (Forever): later, guess
  1901: 2,  // Intellect +9 (wrist) — bracer +9 Intellect is not in the classic list (Forever): later, guess
  1903: 1,  // Spirit +9 (mainHand) — classic enchanting, guess
  1904: 1,  // Intellect +9 (mainHand) — classic enchanting, guess
  2504: 1,  // Spell Power +30 (mainHand) — classic enchanting, guess
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
  7655: 2,  // +12 Spell Power (wrist) — Forever 76xx set with Living Stats: later, guess
  7659: 2,  // +9 Intellect (offHand) — Forever 76xx set: later, guess
  7660: 2,  // +12 Spirit (offHand) — Forever 76xx set: later, guess
  7661: 2,  // +6 Intellect and +5 Spirit (offHand) — Forever 76xx set: later, guess
  7662: 2,  // +65 Spell Power (mainHand) — Forever 76xx set: later, guess
  7665: 2,  // +16 Spell Power (wrist) — Forever 76xx set with Living Stats: later, guess
  7941: 2,  // Grand Arcanist (mainHand) — Grand Arcanist (Forever): later, guess
  7942: 2,  // Grand Sorcerer (mainHand) — Grand Sorcerer (Forever): later, guess
  8203: 1,  // Spirit +4 (wrist, feet) — classic enchanting, guess
  8208: 1,  // Healing Spells +8, Damage Spells +3 (wrist) — classic enchanting, guess
  8209: 1,  // Healing Spells +16, Damage Spells +6 (wrist) — wrist pick (guess): the same Forever set as the neck and Revelation (82xx), which the user has in Phase 1
  8211: 1,  // Spell Power +55 (mainHand) — classic enchanting, guess
  8212: 1,  // Healing Spells +100, Damage Spells +34 (mainHand) — classic enchanting, guess
  8216: 1,  // Insight (mainHand) — classic enchanting, guess
  8217: 1,  // Revelation (mainHand) — user: weapon Revelation
  8218: 1,  // +6 Spell Power (neck) — user: neck 6 spell power
  8219: 1,  // Healing Spells +11, Damage Spells +4 (neck) — classic enchanting, guess
  8481: 1,  // Stamina +2 and Armor +16 (chest, hands, legs, feet) — armor kit, guess
  8482: 1,  // Spell Power +2 and Armor +16 (chest, hands, legs, feet) — armor kit, guess
  8484: 1,  // Stamina +3 and Armor +24 (chest, hands, legs, feet) — armor kit, guess
  8485: 1,  // Spell Power +4 and Armor +24 (chest, hands, legs, feet) — armor kit, guess
  8487: 1,  // Stamina +4 and Armor +32 (chest, hands, legs, feet) — armor kit, guess
  8489: 1,  // Spell Power +5 and Armor +32 (chest, hands, legs, feet) — armor kit, guess
  8490: 1,  // Stamina +5 and Armor +40 (chest, hands, legs, feet) — armor kit, guess
  8492: 1,  // Spell Power +6 and Armor +40 (chest, hands, legs, feet) — armor kit, guess
  8719: 1,  // Defense +4 and Stamina +10 (chest, hands, legs, feet) — armor kit, guess
  8734: 1,  // Intellect +3 (wrist) — classic enchanting, guess
};
WL.ENCHANT_PHASE_SET = {};
WL.enchantPhase = function (id) { return WL.ENCHANT_PHASE_SET[id] || WL.ENCHANT_PHASE_GUESS[id] || 1; };
