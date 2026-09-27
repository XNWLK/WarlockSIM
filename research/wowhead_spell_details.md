# Wowhead Forever — scraped spell details (retrieved 2026-09-23)

> **Superseded for damage values (round 42, 2026-09-26): see `SPELLVALUES.md` in the project root.** The user found in
> game that the effect Value is also +1 for flat damage (Shadow Bolt R9 Value 252, in game 237–265 = 251 average), so
> the sim now uses Value − 1 everywhere, and the trainer ranks by default (R10 / R8 / R7 below are AQ20 book ranks).
> The note below ("flat damage values are used as-is") was the rule until round 41. This file is kept as the raw record.

Source: `https://www.wowhead.com/forever/spell=<ID>` → "Spell Details" table, patch 1.60.1 (beta data).
Scraped in the browser (Wowhead blocks non-browser clients). Text below is copied verbatim
from the table, whitespace-collapsed. Only level-60 max ranks + talent-granted spells.

**Known Wowhead display quirk:** percentage values in the raw effect rows are shown +1
compared with the tooltip (e.g. The Human Spirit tooltip "5%" / raw "6%", Blood Fury "10%" / "11%",
Curse of the Elements "10%" / "11%", Wrack "10%" / "11%"). Rule used in the sim:
**tooltip percentages are authoritative**. Flat damage values are used as-is.

## Damage spells

| Spell | ID | Cost | Cast | CD | Duration | Raw effect(s) |
|---|---|---|---|---|---|---|
| Shadow Bolt R10 | 25307 | 380 Mana | 3 s | – | – | School Damage (Shadow) Value: 269 (SP mod: 0.857) |
| Shadow Bolt R9 | 11661 | 370 Mana | 3 s | – | – | Value: 252 (SP mod: 0.857) |
| Immolate R8 | 25309 | 380 Mana | 2 s | – | 15 s | #1 Periodic Damage Value: 56 every 3 seconds (SP mod: 0.13); #2 School Damage (Fire) Value: 159 (SP mod: 0.2); flags: Periodic Can Crit |
| Corruption R7 | 25311 | 340 Mana | 2 s | – | 18 s | Periodic Damage Value: 74 every 3 seconds (SP mod: 0.2); Periodic Can Crit |
| Bane of Agony R6 | 11713 | 215 Mana | Instant | – | 24 s | Periodic Damage Value: 47 every 2 seconds (SP mod: 0.133); Periodic Can Crit |
| Bane of Doom | 603 | 300 Mana | Instant | 1 min | 1 min | Periodic Damage Value: 1743 every 1 minute (SP mod: 4); Periodic Can Crit |
| Conflagrate R6 | 18932 | 255 Mana | Instant | 10 s | – | School Damage (Fire) Value: 283 (SP mod: 0.429) |
| Incinerate R3 | 1293813 | 325 Mana | 2.5 s | – | – | #1 School Damage (Fire) Value: 218 (SP mod: 0.714); #2 Dummy Value: 26 (= +25% vs Immolate, +1 quirk) |
| Searing Pain R6 | 17923 | 168 Mana | 1.5 s | – | – | School Damage (Fire) Value: 115 (SP mod: 0.429) |
| Shadowburn R6 | 18871 | 365 Mana | Instant | 15 s | 8 s | School Damage (Shadow) Value: 267 (SP mod: 0.429); Create Item on Death: Soul Shard |
| Soul Fire R2 | 17924 | 335 Mana | 6 s | 1 min | – | School Damage (Fire) Value: 432 (no SP mod shown; tooltip = 100% of Spell Power) |
| Drain Life R6 | 11700 | 300 Mana | Channeled | – | 5 s | Periodically Leech Health Value: 52 every 1 second (SP mod: 0.1); Periodic Can Crit |
| Drain Soul R4 | 11675 | 290 Mana | Channeled | – | 15 s | Periodic Damage Value: 85 every 3 seconds (SP mod: 0.1); Periodic Can Crit |
| Siphon Life R4 | 18881 | 365 Mana | Instant | – | 30 s | Periodically Leech Health Value: 42 every 3 seconds (SP mod: 0.05) |
| Wrack | 1316697 | 200 Mana | Channeled | – | 6 s | #1 Periodic Damage Value: 37 every 1 second (SP mod: 0.143); #2 Mod All Damage Done % by Caster Value: 11% — Affected Spells: Corruption, Bane of Agony (all ranks); Periodic Can Crit |
| Death Coil R3 | 17926 | 600 Mana | Instant | 2 min | 3 s | Drain Health Value: 455 (SP mod: 0.214) |
| Hellfire R3 | 11684 | 1300 Mana | Channeled | – | 15 s | Periodic Damage Value: 207 every 1 second (SP mod: 0.022) (AoE, not simulated) |
| Rain of Fire R4 | 11678 | 1185 Mana | Channeled | – | 8 s | Dummy (SP mod: 0.03) (AoE, not simulated) |

## Utility / buffs

| Spell | ID | Raw details |
|---|---|---|
| Life Tap R6 | 11689 | Cost None, Instant, GCD 1.5 s. Tooltip: "Converts 430 health into [(430 + Spirit) * (1)] Mana" |
| Curse of the Elements R4 | 1311680 | 200 Mana, Instant, 5 min. Mod Resistance (All) -74 (tooltip 75); Mod % Damage Taken (All) 11% (tooltip 10%) |
| Curse of Recklessness R4 | 11717 | 115 Mana. Armor -504 (tooltip 505). Guide: "No longer increases the target's damage" |
| Create Spellstone R3 | 17728 | Tooltip: +2% spell haste and +21 Shadow damage (weapon oil) |
| Create Firestone R4 | 17953 | Tooltip: +2% spell crit chance and +21 Fire damage (weapon oil) |
| Bane of Havoc | 1225228 | 5% of base mana, Instant, 5 min, GCD 0 s |
| Demonic Sacrifice | 18788 | Cost None, Instant, GCD 0 s |
| Soul Link | 19028 | 20% of base mana, Instant |
| Shadow Trance (Nightfall proc) | 17941 | Duration 10 seconds |

## Talent-rank spells (lower base values, same coefficients)
| Spell | ID | Raw |
|---|---|---|
| Shadowburn (talent R1) | 17877 | 105 Mana, Value 67 (SP 0.429) |
| Conflagrate (talent R1) | 1293817 | 100 Mana, Value 96 (SP 0.429) |
| Incinerate (talent R1) | 412758 | 205 Mana, 2.5 s, Value 98 (SP 0.714) |
| Siphon Life (talent R1) | 18265 | 150 Mana |

## Pet spells (added 2026-09-23, links supplied by the user)
| Spell | ID | Cost | Cast | CD | Raw effect | Tooltip |
|---|---|---|---|---|---|---|
| Firebolt R7 (Imp) | 11763 | 115 Mana | 2 s (GCD 1 s) | – | School Damage (Fire) Value: 45 (SP mod: 0.571) | "[(57.1% of Spell Power) * 1.1]" with Unholy Power |
| Lash of Pain R6 (Succubus) | 11780 | 160 Mana | Instant | 12 s | School Damage (Shadow) Value: 51 (SP mod: 0.429) | "[(42.9% of Spell Power) * 1.1]" with Unholy Power |
Lower ranks seen for reference: Firebolt 3110 (5, 0.164), 7801 (18), 7802 (26), 11762 (36); Lash of Pain 7814 (17), 7815 (23), 7816 (31), 11778 (37), 11779 (44).

## Excluded Season-of-Discovery leftovers present in the DB
Listed at level 1 in the Warlock ability list but not part of the Forever class per Icy Veins
("Chaos Bolt was not shown"): Chaos Bolt (403629), Metamorphosis (403789), Demon Charge,
Demonic Howl, Menace, Shadow Cleave, Fel Armor (403619), Vengeance, Grimoire of Synergy,
Explorer Imp, instant Drain Life variant (403677–403689). **Not used.**
