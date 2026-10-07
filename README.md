# Xn's Forever Warlock Sim.

A DPS simulator for the Warlock in WoW Forever at level 60 against a level-63 raid boss. It simulates every build
× race thousands of times (pets as their own actors, DoTs, procs, mana, Life Tap, execute phase, consumables, raid
buffs) and ranks the builds, with stat weights, per-spell damage, a DoT chart and the full combat log of a sample fight.

Live version: **[xnwlk.github.io/WarlockSIM](https://xnwlk.github.io/WarlockSIM/)** (also as a [Claude artifact](https://claude.ai/artifact/WzHGwM25MtG9kXFG8rcW9W))

Want to press the buttons yourself? **[Forever Warlocking](https://xnwlk.github.io/ForeverWarlocking/)** is the 3D practice sim built on
the same data and mechanics ([its repository](https://github.com/XNWLK/ForeverWarlocking)).

## Features

### Build ranking
- Every build × race simulated 1,000 times (adjustable), each fight ±10% in length, with a fixed random seed so results
  are reproducible.
- One row per build with its best race; expand it to see the other races and a "no race" baseline (what the race adds).
- **Spells & damage** column: your damaging spells in priority order, each with its share of the build's damage, then
  the pet, Demonic Brand, Touch of the Grave and explosives.
- DPS with error margin, gap to the best build, and **stat weights** for spell power, hit, crit, haste and Intellect
  (shown as the spell power they are worth; Spell Pierce in the details).
- Shows every build by default; an optional cut-off hides builds behind the best, and a **pin** keeps any build shown.
- Races: Human, Gnome, Orc, Undead, Troll with their racials (Sword Specialization, Eureka!, Blood Fury, Touch of the
  Grave, Berserking…).

### Build details
Click a build for:
- Summary with DPS before and after the execute phase, stat weights and a race comparison.
- **DoT chart** of a sample fight: uptime, gaps, refreshes and crits of every DoT.
- Timeline, stats used in the fight (with where each number comes from), per-spell numbers (casts, hits, crits, misses,
  damage), talents, the full priority list, mana, DPS distribution, buff and debuff uptimes.
- The complete rotation log of a sample fight.

### Your setup
- **Stats:** spell power (also Shadow / Fire only), hit, crit, haste, Intellect, Spirit, Stamina, MP5, Spell Pierce;
  a **quick setup** bar switches between starter and hit-capped gear, and between the default and the maximum set of
  buffs and consumables, and holds your saved **presets**.
- **Raid buffs:** Arcane Intellect, Mark of the Wild, Fortitude, Divine Spirit, Kings, Wisdom, Mana Spring (+ Restorative
  Totems), Mana Tide, Innervate, Moonkin aura, Power Infusion.
- **Boss debuffs:** Sunder / Expose Armor, Faerie Fire, Curse of Recklessness, another Warlock's Curse of the Elements,
  Judgement of Wisdom; boss armor and resistances.
- **Consumables:** flasks, elixirs, food, drinks, weapon oils, Spellstone / Firestone, mana and Spellblasting potions,
  runes, and Engineering explosives.

### Fights
- Fight length, execute threshold, number of fights.
- **Multi-target:** 2–3 targets with Bane of Havoc copying damage to target 2, optional **multi-DoTting** of the extra
  targets, and **Hellfire / Rain of Fire** hitting every target.
- **Movement** (only instants while moving), **latency** and projectile **travel time**.
- **Precast**: pick a spell that finishes as the fight timer starts (Soul Fire, Shadow Bolt, Immolate, …).
- Encounter presets: standard, short, long, movement, heavy movement, two / three targets, high latency.
- Options: keep Curse of the Elements up, pets on or off, AQ20 book ranks (Shadow Bolt R10, Immolate R8, Corruption R7),
  Eureka! timing, pet scaling.

### Make your own builds
- **Build editor:** click talents in the three trees, pick the pet out, the sacrificed pet and the weapon (Spellstone /
  Firestone / oil), and arrange the spell priority with drag and drop.
- Live checks that the build is valid (talent points, requirements, pet rules).
- Mid-fight pet swap at execute (Demonic Sacrifice + Fel Domination + summon).
- **Quick sim** a build on its own — DPS per race and the damage breakdown right next to the talent trees — or add it to
  the ranking; edit a copy of any build straight from the results.
- Share builds as a code.

### Compare
- **Compare two builds** side by side, each with the race you pick: a verdict (how big the gap is and whether it is
  clear), numbers, stats, damage per source, time spent per spell, uptimes, races, talents, priority and DPS spread.
- **Rank arrows** show which builds moved up or down after you change your settings.
- **Health and threat:** Life Tap and Hellfire cost health, you set how much healing you get, and every build shows its
  threat per second (with Blessing of Salvation and Tranquil Air Totem as raid buffs).
- **Windfury Totem** for pets with a melee attack: extra attacks that also use up Demonic Brand charges.
- **Rank for your race**: list the builds for the race you play instead of each build's best race.
- **Batch compare:** save several setups (e.g. pre-raid vs raid-buffed) and run them all, or add the current run to
  compare later runs against it.
- Save settings as **presets**, or share them as a code.

### Also
- Hover tooltips with the in-game text for talents and spells.
- A banner tells you when the results are out of date after changing settings.
- Opens instantly with the default results; runs use all your CPU cores (Web Workers).
- Light and dark theme; works on phones.

## Notice

### Copyright
Copyright © 2026 XNWLK. All rights reserved.

This repository has no open-source license. You may view it and fork it on GitHub as GitHub's Terms of Service
allow. Copying, modifying, redistributing or reusing the code or documentation elsewhere requires the author's
permission — ask by opening an issue.

### Fan project
This is an unofficial fan-made tool. It is not affiliated with, endorsed by or sponsored by Blizzard Entertainment or
Wowhead.

World of Warcraft, Warcraft and Blizzard Entertainment are trademarks or registered trademarks of Blizzard
Entertainment, Inc. in the U.S. and/or other countries. Game content shown or used by this tool — spell, talent and
item names, tooltip text, numbers and icons — belongs to its respective owners and is used for reference only.

Game data was gathered from Wowhead and from measurements in the game. No Wowhead data files are included in this
repository.

### No warranty
The simulator is provided "as is", without warranty of any kind. Its results are estimates built on documented
assumptions, some of which are guesses, and they can differ from what happens in the game.
