# Patch notes — Xn's Forever Warlock Sim

What each version added or changed, newest first. Version = the version of the
[live page](https://claude.ai/artifact/WzHGwM25MtG9kXFG8rcW9W).

## v146
- **Demon melee can reach full hit:** the first 1% of your demon's melee hit no longer goes to waste, so with 17% spell hit
  (8% melee hit for her) the Succubus never misses. Succubus builds gain back about 0.1–0.4% DPS.

## v145
- **Demon hit (Forever):** your demon's spells still hit as often as yours, but its melee now gets 8/17 of your spell hit
  (17% spell hit → 8% melee hit). So the Succubus' melee misses a little more than before: with 17% hit she still misses 1%
  (the first 1% does not count against a level-63 boss). Succubus builds lose about 0.5–0.9% DPS; Imp builds are unchanged.

## v144
- Gear builder: clicking the Main Hand slot while another slot was open did nothing (the other slot stayed open). Fixed.
- **Your own rules in the priority list** (build editor → "Your own rules, groups and variables"): a rule casts a spell when
  your conditions hold — DoT or buff time left, cooldowns, fight time left or gone, boss health, mana, Soul Shards, Demonic
  Brand charges — combined with "all of", "any of" and "not". Groups put a list of actions in the priority as one;
  variables give a number or a condition a name. Build codes carry them.
- **Gear builder:**
  - the item list has filters (item level range, side, source: crafted, quest, vendor, drop, PvP, or a raid), favourites (★)
    and a compare button (⇄) on every row, and warnings (a unique item already worn, the other side's item, a two-hander that
    would switch off your off-hand item);
  - **gear sets** with names: save what you wear, load it again;
  - **best combination**: tries your favourites and the bag items of a gear code (the addon's "Bags too") in every slot and
    shows the best five, simulated for the build under "Value for" (all combinations when there are few, else one slot at a
    time); lock the slots you want to keep.
- **Results:** "Set as reference" keeps a run: every row then shows its change against it. The spell table has the average
  hit. The fight timeline can show your mana, one row per spell and the global cooldown after each cast.
- **Stat weights:** choose which ones are computed (Spell Penetration, Spirit and MP5 can be added), and a precision (more runs
  on new fights until every weight is known to ± that much spell power). "Copy as Pawn scale" in a build's details.
- **Raid buffs:** the Atiesh auras of a Warlock, a Mage or a Druid in your party, and Blood Pact from another Warlock's Imp.
  Innervate and Power Infusion take a count (several Druids / Priests).

## v143
- **Gear builder: the item list is here.** Every item a Warlock can wear that has at least one stat the sim uses (spell
  power, Shadow or Fire power, hit, crit, haste, Spell Pierce, Spell Penetration, Intellect, Spirit, MP5): 2,042 items from the
  Wowhead Forever database, with their icons. Pieces of other classes' item sets are left out. Click a slot and the items for it are listed best first for the build chosen under
  "Value for", with item level, required level, stats and their worth in spell power; type a name to narrow the list.
  Hit, crit and haste ratings are turned into % the way the sim counts them (10 hit = 1%, 14 crit = 1%, 10 haste = 1%).
- **Every enchant** (197: Enchanting, plus arcanums, armor kits, shoulder enchants and other item enhancements), listed under the
  items of each slot that takes one, best first; enchants for two-handed weapons only show while a two-handed weapon is in the main hand. The
  neck, the belt and the held off-hand item take enchants now too (Forever has enchants for them). Items and enchants that are not on Wowhead yet: type them in, or load a gear
  code from the in-game addon, as before. The gear builder is still under construction.
- **Spell Penetration** is a stat of its own (Stats panel and gear builder): it lowers the boss's resistance, but never
  below 0, so it only helps while something is still resisted (at the default settings: before Curse of the Elements is
  up). Spell Pierce is a different stat that goes below 0.

## v142
- **Amplify Curse** now raises the whole Bane of Agony: every tick of the Bane of Agony it is used with is multiplied by
  1.5 after everything else (talents, auras, curse, crit). Before, only the base value was raised, not the spell power
  part. The four builds with Amplify Curse gain: Destruction – Incinerate, Succubus +0.4% (658.0), Destruction – Incinerate,
  Imp +0.4% (630.8), SM Ruin (classic) +0.6% (630.5), Wrack Succubus +1.0% (578.2). The others do not use it.

## v141
- **Demons crit with your spell crit.** Every demon attack, the Succubus' melee too, now crits with your spell crit (minus
  the usual 4.8% for melee against a level-63 boss). Her own 7.52% melee crit is gone. So Agility does nothing any more:
  **Grace of Air Totem and Scroll of Agility IV are gone** from the raid buffs, and so are the Agility box on the gear sheet
  and the Agility and melee crit lines in the stats. Ruthless and Savage raise your demon's crit through your spell crit.
  Succubus builds gain a little (Destruction – Incinerate, Succubus +0.25%, 655.4; the others below 0.05%); Imp builds do
  not change. Old settings codes and saved gear sets with Agility still load (the Agility is ignored).
- **Demonic Brand 2/3 or 3/3?** Checked for every build with 3/3 (default settings with every race, hit-capped gear, 60 s and
  300 s fights): 2/3 is never better. The freed point has to stay in the lower rows of Demonology (the tree's point
  rules), and nothing there adds damage. The third point is worth 1.4 to 1.7% for Demonology – Pact, Succubus, Shadow Bolt,
  1.8 to 2.0% for Affliction/Demonology – Pact, Succubus, Shadow Bolt, and at most 0.1% for the Fire Imp build (nothing
  with hit-capped gear). All builds keep 3/3.

## v140
- The in-game addon link at the top of the page now goes to its download page; its GitHub page is linked next to it.

## v139
- **Range talents.** Destructive Reach now lengthens only your Destruction spells, Grim Reach only your Affliction spells
  (the Forever patch of 16 October), so no spell gets both. Range changes no damage here: the boss is always in range.

## v138
- **Forever patch of 16 October.** The sim follows the new game patch:
  - **Shadow Mastery** now gives 2 / 4 / 6 / 8 / 10% Shadow damage (was 1 to 5%).
  - **Malediction is gone.** Grim Reach takes its place in the tree; it only adds range, so it changes no damage.
  - **Human: Ruthless**, +2% crit with any weapon (was Sword Specialization, only with a sword). The "Sword equipped" box
    is gone. **Orc: Savage**, +1% crit. Both also raise the melee crit your Succubus gets from you.
    **Blood Fury** has a 3 minute cooldown (was 2).
  - **Gnome: Eureka!** is now an 8 second buff: every damaging spell that finishes while it is up deals 10% more and costs
    10% less. A cast still going when the 8 seconds end gets nothing; a drain's ticks count only while it lasts. DoTs get
    nothing, as before.
  - **Undead: Touch of the Grave** has a 30% chance (was 10%), then 25 seconds before it can happen again. Nothing raises
    its damage any more: no curse, no Improved Shadow Bolt, no aura, no Power Infusion.
  - **Windfury Totem and Flametongue Totem** only work for players now, so they no longer help your demon: both are gone
    from the raid buffs, and so is **Tranquil Air Totem** (every Paladin has Salvation now). **Blessing of Salvation** is now
    **Salvation**. Moonkin Form's aura is spell crit only, raid-wide (no change for a Warlock).
- **Builds that had Malediction points** (searched point by point, where each gains the most; then every build was
  searched again under the new rules):
  - Affliction/Demonology – Pact, Succubus, Shadow Bolt: the Affliction side shrinks to Suppression, Improved Corruption and
    Improved Life Tap; the points go to Improved Shadow Bolt 5/5 and Ruin (now 8/31/12).
  - Destruction – Incinerate, Succubus: +1 Amplify Curse, +4 Unholy Power (now 14/4/33).
  - SM Ruin (classic): +2 Improved Corruption, +1 Amplify Curse, +2 Improved Bane of Agony.
  - Wrack Succubus: +2 Improved Life Tap, Amplify Curse, Ruin 5/5 and Agonizing Flames 3/3 (which also raises its Shadow
    Bolts) instead of Improved Drains (now 33/0/18).
- **What it does to the numbers.** The order of the builds is the same. SM Ruin gains 2.8% and Wrack Succubus 8.5% (Shadow
  Mastery and the new talents); Aff Pact Shadow Bolt is level with before; the others move by less than 1%. Orc rows gain from Savage; Undead rows lose a little.
- **Racial cooldowns:** measured again for Eureka!, Blood Fury and Berserking at every moment of the fight. Using them
  when the first Bane of Doom explodes (the default) is still as good as any other time, so nothing changed there.
- **Your old builds still load.** A build code or saved build with Malediction points moves them to Grim Reach as far as
  they fit (it has 2 ranks). A saved build that then needs points spent, or breaks a row rule, is kept in the build
  editor's list as "needs fixing": open it there, spend the points and save it. Old settings codes with the removed totems
  or the old Sword box load as before.

## v137
- **Gear builder: an item's worth.** Every item and enchant shows what it is worth in spell power for a build you pick
  ("Value for"), worked out from that build's stat weights. So does the item you are typing in, while you type.
- **Gear builder: compare with what I wear.** Type an item into a slot and press the button: the best builds on the sheet
  are simulated with what you wear now and with the new item, on the same fights, and you see the DPS change for each.
- **Gear builder: enchants.** Head, shoulder, back, chest, wrist, hands, legs, feet and main hand take an enchant. It counts
  while the slot holds an item.
- **Gear codes.** A gear code (it starts with WFG1:) holds everything you wear. The in-game addon can make one from your
  character; paste it into the gear builder (or the Input / output box) and every slot is filled. "Make gear code" makes
  one of what you have in the builder.
- **Talent marks.** In every talent tree, a small mark shows talents that are not simulated (✕), only partly (½), or only
  with a setting (if). Hover for why.
- **What each talent point is worth.** "Value of each point" in the build editor simulates the build once more for every
  talent, with one point fewer there, and lists what each last point adds.
- **What each raid buff is worth.** A new chart in the Charts card: for one build, what you lose without each raid buff
  and boss debuff you have on, and what you would gain with each one you have off.

## v136
- **Gear builder (under construction).** At the very bottom of the page there is now a character window with every
  gear slot. Click a slot to put an item in. Switch on "Use this gear for my stats" and the Stats panel starts from a
  naked character and adds up your items; whatever you type in the Stats panel is added on top. Switched off, the Stats
  panel keeps its numbers and works as before.
- The item list is still empty: it will be filled from the Wowhead Forever database once there is enough data there.
  Until then you type in each item's stats yourself. Only the stats count for now; "Use:" and "Chance on hit:" effects
  are not simulated yet. Your items are kept in your browser, and settings codes and share links carry them while the
  builder is switched on.

## v135
- The sim has a logo: the results table, with a Shadow Bolt as the number-one row. It is next to the title at the top of
  the page and the icon in the browser tab.

## v134
- The links at the top of the page now include the in-game addon, Xn's Warlock Sim: the sim inside the game, with your
  own character.

## v133
- Fixed: a damaged or cut-off share link showed its message on the page but also left an error in the browser's
  console. The message stays; the console stays clean.

## v132
- **Share link.** A button above the results copies one link that opens the sim with your settings loaded. "Share this
  build" in a build's details makes a link that also opens that build: a build on the sheet opens its row, your own
  build opens in the build editor with a quick sim (it is not added to the other person's sheet).
- Links are short: they carry only what differs from the default settings.
- **Copy results.** Copies the results table as text that reads well in a chat such as Discord — a title line with your
  gear and fight, the builds in a fixed-width table, and a share link underneath.
- If the page is not allowed to copy by itself, the text is shown selected so you can press Ctrl+C.

## v131
- New card **Charts**, below Compare two builds, with two charts. Each point is a real simulation with your current
  settings, and the same fights are used at every point, so the lines are smooth.
- **DPS by a stat:** how a build's damage grows as one stat on your gear goes up — spell power, hit, crit, haste,
  Intellect, Spirit or Spell Pierce. You can see where a stat stops helping (hit at each build's cap) and read the DPS
  per point at your own value.
- **DPS by fight length:** every build from 30 seconds to 5 minutes, showing which one is ahead in short and in long
  fights.
- Draw every build on the sheet or just one. Hover the chart for the exact values; a table of all values is below it.

## v130
- **Show the maths.** In a build's details, click any row of the Spells table to see how that damage is calculated,
  step by step, with your own stats and settings: spell power, base value, the talents that add up, the auras that
  multiply, what the boss's debuffs add, the crit, and the cast time, mana and miss chance.
- It works for every source: your spells and DoTs, the Imp's Firebolt, the Succubus' Lash of Pain and her melee swing
  with its full attack table, Demonic Brand, the totem hits, Touch of the Grave, explosives and Life Tap.
- No result changes: it only shows the numbers the sim already uses.

## v129
- The page header has a new link, **How it's calculated**, next to the GitHub link. It opens the rule book with every
  formula and what each talent, spell, pet, racial, buff and consumable does in the sim.

## v128
- The Succubus' melee range is now in the sim's data: 5 yards, the same as Lash of Pain. It is listed for reference
  (the sim never checks range), so no result changes.

## v127
- New: **[How the sim calculates](MECHANICS.md)**, the full rule book. It has the exact formula behind every number, what
  each talent, spell, pet, racial, raid buff, boss debuff, consumable and priority action does in the sim, worked
  examples you can follow step by step, and a list of what is assumed or left out. It is linked from the README.
- Its tables and worked examples are written from the sim's own data, so they always match the version they ship with.
- Nothing in the sim itself changed: every result is the same.

## v126
- Input / output: the **Make build code** button now sits right next to **Make settings code**; the list of builds to
  pick from comes after the two buttons. Nothing else changed.

## v125
- **Molten Skin** and **Soul Link** also reduce what the **Demonic Rune** and the **Goblin Sapper Charge** cost you in
  health, by the same amount as for Hellfire: 2% per Molten Skin point, 30% with Soul Link while a demon is out, 37%
  with both. A rune then costs 504 health instead of 800, a Sapper 315 instead of 500 on average.
- Life Tap is not reduced: it still costs 430 health.
- No DPS number changes: with a Demonic Rune ticked, the three builds with Soul Link just lose less health.

## v124
- **Molten Skin** and **Soul Link** now reduce the damage Hellfire does to you: Molten Skin by 2% per point, Soul Link by
  30% while a demon is out (not after Demonic Sacrifice). Together they multiply: 37% less with both.
- With less damage to yourself, a build that uses Hellfire can keep channelling longer on the same healing.
- No build on the sheet uses Hellfire, so the default results are unchanged.

## v123
- **Windfury Totem and Flametongue Totem no longer stack**, and neither stacks with Grace of Air Totem: only one of the
  three can be on. Ticking one unticks the other two.
- Tranquil Air Totem is as before: not together with Windfury or Grace of Air. It can still be on with Flametongue.
- The **Max** buffs & consumables setup now takes Windfury Totem alone. For a Succubus it is worth as much as Flametongue
  Totem or more, depending on the build.
- A saved setup or settings code with more than one of these totems on loads with the first of them: Windfury, then
  Flametongue, then Grace of Air.
- Default results are unchanged (all three totems are off by default).

## v122
- **Destro Incinerate Imp** casts Curse of the Elements earlier: right after Immolate instead of after Conflagrate. A boss
  resists part of your damage until the curse is on it, so fewer of your hits are affected. Worth about 0.2% for that build;
  the other builds are unchanged.

## v121
- Flametongue Totem has its icon.

## v120
- New raid buff: **Flametongue Totem** (off by default). Pets with a melee attack — Succubus, Felhunter, Voidwalker — deal 27
  extra Fire damage on every hit (the totem's damage depends on attack speed; theirs is 2.0 s). The extra hit can miss and
  crit like the pet's spells and does not use up a Demonic Brand charge.
- It **stacks with Windfury Totem**, and Windfury's extra attacks trigger it too. Flametongue alone is worth about 2.1–2.7%
  for Succubus builds, both totems together about 4.6–5.9%.
- The **Max** buffs & consumables setup now includes it.
- Shorter descriptions for the two totems, so the Buffs & debuffs tab still fits without a scroll bar.

## v119
- New option: **Precast** (Fight & pets → Fight). Pick the spell you start with — Shadow Bolt, Immolate, Incinerate, Searing
  Pain, Soul Fire or Corruption. A precast is started before the pull so that it finishes as the fight timer starts: it lands
  at second 0, its cast time costs no fight time, its mana is already spent and its cooldown starts at second 0.
- Off by default, so the default results are unchanged. A Soul Fire precast is worth about 1.0–1.3%, the other spells
  0.3–1.0% depending on the build.
- A build that cannot precast the chosen spell (Incinerate without the talent, Corruption made instant by talents) starts
  the fight as usual; its details say so.
- Your cooldowns are not used for the precast: they follow "Pop cooldowns" from the first cast of the fight on.

## v118
- The Buffs & debuffs tab fits its card again without a scroll bar. The two notes at its bottom moved into the hover text of
  the "Boss debuffs" heading.

## v117
- Windfury Totem, Grace of Air Totem and Tranquil Air Totem are one totem type: only one of the three can be on.
- Tranquil Air Totem and Blessing of Salvation do not stack their threat reduction.
- Grace of Air Totem gives 89 Agility (was 77).
- Windfury Totem has its icon.

## v116
- New raid buff: **Windfury Totem** (off by default). Pets with a melee attack — Succubus, Felhunter, Voidwalker — get a 20%
  chance on every hit of one extra attack with 246 extra attack power. The extra attack uses up a Demonic Brand charge like
  any other pet attack. Worth about 2–3% for Succubus builds.
- Windfury Totem and Grace of Air Totem do not stack: ticking one unticks the other.

## v115
- **Improved Shadow Bolt**: a Shadow Bolt crit now always applies it. Before, the debuff rolled a second hit check and could
  miss. Builds with the talent gain up to 0.3% at the default hit chance; nothing changes at the hit cap.

## v114
- **Demo Pact Shadow Bolt Imp** was taken off the build list. Seven builds remain; their numbers did not change.

## v113
- Blessing of Salvation and Tranquil Air Totem have their icons.

## v112
- Cooldown timeline: a placed use can follow the **execute phase** or the **first Bane of Doom explosion** instead of a fixed
  second (select the block, then "At execute" / "At the Doom explosion"). New rows for **Amplify Curse** and the **pet swap**.

## v111
- **Health:** Life Tap costs 430 health, Hellfire burns you too, a Demonic Rune costs 800. New setting in Fight & pets:
  "Healing you receive" — healed for X every Y seconds (default 1000 every 10 s). Drain Life, Siphon Life, Death Coil and
  Touch of the Grave give health back. Without enough health a Life Tap has to wait.
- **Voidwalker and Felhunter sacrifice** (2% mana / 3% health every 4 s) can be picked in the build editor.
- **Threat:** threat per second in a build's details and in compare; Searing Pain counts double (less with Demonic Brand),
  Suppression reduces it; new raid buffs Blessing of Salvation (−30%) and Tranquil Air Totem (−20%).

## v110
- Wrack's +10% now also applies to Siphon Life and Bane of Doom.
- Grace of Air Totem and the Scroll of Agility no longer stack (only the bigger one counts).
- Bosses have level resistance (+24), and Curse of the Elements removes it: only hits before the curse is up can be partly resisted.
- Soul shards never run out.

## v109
- 5-second rule: Spirit does not regenerate mana while you channel (Drain Life, Wrack, Hellfire, Rain of Fire). It does
  right after the channel if you then Life Tap, because the 5 seconds count from the start of the channel.

## v108
- **Rank for your race**: a race picker above the results ranks the builds for the race you play instead of each build's
  best race.
- **Fight & pets is shorter**: boss armor and resistances, run settings and pet scaling are under "Advanced".
- **Slimmer top strip**: spell power, hit, crit, fight length and Sim!. "Add this run" is now in the batch-compare card.
- New visitors see three short steps under the title until their first Sim!.

## v107
- **Presets moved to the top bar**, next to the quick-setup switches, and replace the gear sets (one way to save and load a
  setup instead of two). Gear sets you saved before are still in the list as "Your gear sets (gear only)".
- **"Share settings" is now "Input / output: settings and builds"**: one box that makes and loads both settings codes and
  build codes.
- **Compare two builds** shows more: a one-line verdict (how big the gap is and whether it is clear or too close to call,
  and where it comes from), DPS from you / the pet / procs, crit and miss rates, and where each build spends its time.

## v106
- **5-second rule**: Spirit now regenerates mana while you have spent none for 5 seconds (8 + Spirit / 4 mana every 2
  seconds). A cast-time spell counts from the end of its cast, an instant or a channel from its start. Life Tap does not
  restart the 5 seconds. MP5 ticks all the time, as before.
- For normal fights this changes little (at most 0.2% on the default sheet; Wrack gains the most). It matters with long
  movement phases and long channels. A build's details show the mana gained this way.

## v105
- The bar under each DPS number now runs from 20% behind the best build (empty) to the best build (full); it was 10%, which
  made small gaps look large.

## v104
- Tidied the texts on the page: no more internal reference codes (like "A58") in gear set names, tooltips or the footnote.
- Each build's details now have a short "About this build" description instead of the old research notes.
- The "Default" preset is named after the buffs and debuffs that really are the defaults.

## v103
- Quick setup: hit-capped gear is now 1000 SP / 17% hit (was 800 SP / 16%), and "Max" uses the Major Spellblasting Potion
  instead of the Major Mana Potion.

## v102
- **Eight builds instead of thirteen**: Aff Pact Fire Imp, Demo Pact Fire Succubus, Aff Pact Drain Life Succubus, Aff Shadow Bolt
  Succubus and DS Ruin are off the sheet. The other builds' numbers are unchanged.
- **Quick setup** above the settings: Gear (Default | Hit-capped: 800 SP / 16% hit / 20% crit) and Buffs & consumables
  (Default | Max). Each switch changes only its own part, so you can combine them. Also in the Presets list.
- **Rank arrows**: after you change settings and sim again, every build shows how many places it moved up or down.
- **Quick sim** now has its own panel next to the talent trees: a big DPS number, every race with a bar, and the damage
  breakdown per spell (click a race to see its breakdown).
- **Compare two builds** is rebuilt: pick a build and a race per side; numbers, stats, damage per source, uptimes, races,
  talents, priority and DPS spread side by side.
- DPS numbers in the results table are bigger and coloured.
- Elixir of the Owl and Elixir of Sages no longer stack their 2% crit (their Intellect and Spirit still both count).
- "Sword equipped (Human)" is only shown while the race is set to Human.

## v101
- The early Life Tap settings were searched again with the corrected Soul Fire cooldown. They hold; only Demo Pact Fire
  Succubus moves (80% / 60 s → 70% / 45 s, +0.2%).

## v100
- **Touch of the Grave (Undead) now scales with Shadow damage %**: Improved Shadow Bolt and Curse of the Elements on the
  target, Demonic Sacrifice (Imp), Master Demonologist (Succubus), Soul Link, Shadow and Flame, Power Infusion. It still
  scales with Stamina and not with spell power. Undead rows gain 0.2% to 0.8%; Undead is now the best race for 12 of
  the 13 builds.

## v99
- Fixed: **Soul Fire's cooldown now starts when the cast finishes**, not when it begins. In the execute phase that means
  fewer Soul Fires; the five builds that use it lose 0.35% to 0.73% (Demo Pact Fire Imp 725.6 → 722.4).

## v98
- New priority action with a box you fill in: **Wrack when the shortest DoT has more than _ s left** (default 6 s). It
  checks the DoTs your priority list keeps up (Corruption, Immolate, Siphon Life, Bane of Agony — not Bane of Doom); when
  the shortest one has less time left, the list moves on to the filler you put below it (Shadow Bolt, Drain Life, …).

## v97
- **Every built-in build now taps early**: "Life Tap when mana is below _% and more than _ s remain" sits right above
  the filler, with the best setting found for each build (for example 80% / 45 s on the Demo Pact builds, 60% / 10 s on
  Demo Pact Shadow Bolt Imp). Gains: +0.1% to +1.4%.
- Why it works: the number of Life Taps stays the same, but they move out of the execute phase and stop cutting in
  front of DoT refreshes and Soul Fire.
- New top numbers: Demo Pact Fire Imp 725.6, Demo Pact Shadow Bolt Succubus 710.9, Aff Pact Shadow Bolt Succubus 692.7.

## v96
- New priority action with two boxes you fill in: **Life Tap when mana is below _% and more than _ s remain** (default
  40% / 25 s). The automatic Life Tap when you cannot afford the next spell stays. Build codes carry your numbers.

## v95
- Links at the top of the page: this sim's GitHub, the 3D practice sim **Forever Warlocking** and its GitHub.

## v94
- Fixed: a **build code** (WFB1:…) pasted into the settings-code box was refused. Both code boxes now accept both kinds
  and load the code where it belongs; the buttons say which is which.

## v93
- New spells: **Hellfire** and **Rain of Fire**. Both hit every target of the fight (Fight & pets → Targets) and can be
  picked as the filler in the build editor. Their ticks can crit (Hellfire crits in Forever, unlike Classic). Hellfire's
  damage to yourself is not counted.
- As a filler Hellfire only pays off on 3 targets (and for a few builds on 2); Rain of Fire almost never. No built-in
  build uses them.
- The sim now also runs at **https://xnwlk.github.io/WarlockSIM/**.

## v92
- Data: every spell now carries its **range** (also the pet spells and the Engineering explosives), and Destructive Reach
  raises it in the spell table. No effect on the simulated numbers — the boss is always in range.

## v91
- New priority action: **Searing Pain in the execute phase only to trigger Decimation** — one Searing Pain right before
  each Soul Fire, your normal filler otherwise. For Drain Life, Wrack and Incinerate fillers, which do not trigger
  Decimation themselves. (The older "Searing Pain in the execute phase" keeps using Searing Pain as the execute filler.)

## v90
- New priority action: **Conflagrate only when Immolate is about to expire** (≤ 3 s left). Worth +3–4% on builds without
  Shadow and Flame, where Conflagrate consumes Immolate; with Shadow and Flame 5/5 keep Conflagrate on cooldown.

## v89
- **DoTs are dynamic** (Forever, unlike Classic): every tick, including the Bane of Doom explosion, uses the spell power you
  have at that moment — so Blood Fury and the Spellblasting potion now buff a Doom that explodes while they are up.
  Only Orc numbers change with the default settings (about +0.1%).

## v88
- Cooldown timeline: the **racial row** now shows one race at a time (Orc / Troll / Gnome buttons) with that racial's real
  duration and cooldown. The "=" button keeps one set of times for all three races; click it to give each race its own.

## v87
- Cooldown timeline rows reordered: racial, Power Infusion, Spellblasting, mana potions, rune, then the Engineering items.

## v86
- Cooldown timeline: **every cooldown always has a row with its own checkbox** — the same switch as in the Buffs &
  debuffs / Consumables tabs, so you can turn potions, runes, explosives and Power Infusion on and off right there.
  Switched-off rows are greyed. Each potion and explosive keeps its own placed times.

## v85
- **Custom cooldown timeline**: "Pop cooldowns → custom timeline" (Fight & pets) lets you place every use of your racial
  cooldown, potion, Power Infusion, rune and explosives on a timeline of the fight. Click a lane to place, drag to move,
  click a block to edit or remove. Anything you do not place is used automatically as before.

## v84
- The right settings panel now always has the **same height as the Stats panel**: switching tabs no longer shifts the
  page, and every tab fits without scrolling (more compact Consumables and Fight & pets layouts).
- Elixir of the Sages removed (Elixir of Sages stays).

## v83
- Consumables removed: Flask of Distilled Wisdom, Elixir of Greater Intellect, Elixir of Cunning, Elixir of Greater Spirit, Brilliant Mana Oil.

## v82
- **Boss armor and resistances** moved from Buffs & debuffs to the Fight & pets tab (always shown).

## v81
- The separate **Eureka! pop** setting is gone: Eureka! no longer affects DoTs, so it simply follows the Pop cooldowns setting.
- **Fight & pets**: the run settings and pet scaling are always shown (no "Advanced" fold).

## v80
- **Pop cooldowns** setting: pop your potion, racial cooldown and Power Infusion on the pull, when the first Bane of Doom
  explodes (default) or in the execute phase.
- **Major Spellblasting Potion** is now +47 spell damage (was 40).
- Consumables: only the biggest version of each is listed (removed Arcane / Minor Arcane Elixir, Mageblood Elixir,
  Sagefish Delight, Wizard Oil).

## v79
- **Spellstone / Firestone and weapon oils now stack** (found in game: they are not exclusive). Tick an oil in the
  Consumables tab and the stone stays on. Brilliant Wizard Oil on top is worth about +4%.

## v78
- **Light / dark button** next to the title. Auto (the default) follows your system as before.

## v77
- Talents you haven't picked now show how many points they can take (0/5, 0/3, …).

## v76
- **SM Ruin** now 30/0/21 (−3 Improved Corruption, +3 Cataclysm), **DS Ruin** −2 Improved Corruption +2 Improved Life Tap,
  **Wrack Succubus** keeps Improved Shadow Bolt up with Shadow Bolt: +0.7%, +1.2%, +4.1%.

## v75
- The race button is now a **"+4 races" pill**, and a **Show all races** switch above the table opens every build's races.
- Default fight length is now **2 minutes** (was 3); all builds were re-checked for it. Demo Pact Shadow Bolt Imp,
  Aff Pact Drain Life and Aff Shadow Bolt Succubus now switch to **Searing Pain in the execute phase** (+0.5 … +1.6%).

## v74
- **Shadow Bolt Rank 2 removed** (gutted in Forever): the Rank 2 filler and both Rank 2 priority actions are gone. Old build
  codes still load — Rank 2 becomes the normal Shadow Bolt; the "below 740 mana" action is dropped.

## v73
- Eureka! is now popped **before a long cast** by default (was: timed with Bane of Doom, which no longer gains from it).

## v72
- **Eureka! (Gnome)** follows the Forever patch: its +10% no longer applies to DoT ticks; direct hits and channel ticks
  (Drain Life, Drain Soul, Wrack) still get it. Gnome builds −0.3 … −0.8%.

## v71
- **Faster runs**: a full Sim! takes about 40% less time on a many-core PC (uses every CPU thread now) and ~20% less on
  any PC. The numbers are exactly the same as before.

## v70
- **Pushback**: new "Take a hit every (s)" option and a "Taking damage" preset in Fight & pets. Hits push casts back
  (1.0 / 0.8 / 0.6 / 0.4 / 0.2 s, then 0.2 s) and cut channels by 25%.
- **Intensity**, **Fel Concentration** and the new Paladin raid buff **Concentration Aura** give a chance to ignore it.
- Real icons for Grace of Air Totem and Scroll of Agility IV.

## v69
- **Wrack DS replaced by Wrack Succubus** (40/0/11): Succubus out instead of the Imp sacrifice, Bane of Agony only,
  Improved Bane of Agony, Improved Drains, Bane and Ruin. 499.9 DPS (Human), +7.7% over Wrack DS.

## v67
- **Loads instantly**: the default results come with the page (was ~2.5 min of simulating on a first visit).
- **Runs use all your CPU cores** (Web Workers): about 2–4× faster, and the page stays responsive.

## v66
- **Demonic Brand goes up early** (0–1.5 s) in the Fire builds and Demo Pact SB Imp (+0.03 … +0.16%).

## v65
- **Succubus melee crit now uses your melee crit (Agility)**, not your spell crit: Succubus builds −0.9 … −1.1%.
- New raid buffs: **Grace of Air Totem** (off) and **Scroll of Agility IV** (on); Agility and Melee crit rows in the stats.

## v64
- Spells & damage: Death Coil is shown last.

## v63
- Every build now finishes the fight with **Death Coil** (+0.13 … +0.50%).

## v62
- **Death Coil**: on cooldown, or as the **finisher** (the last spell before the boss dies).
- **Shadow Bolt Rank 2 below 740 mana** and **Rank 2 to keep ISB up** as priority actions.

## v61
- **Fight timeline** (build editor → super advanced): drag spells onto a timeline to cast them at exact times; the
  priority still fills the gaps, recasts misses and takes over after the end.

## v60
- **Faerie Fire and Curse of Recklessness don't stack** (like Sunder / Expose): Faerie Fire on by default, Curse of
  Recklessness off. Ticking one debuff of a pair unticks the other.

## v59
- New priority action **Conflagrate for Shadow and Flame**: Conflagrate only to keep the Shadow buff up (twin of the
  Shadowburn one).

## v58
- **All builds shown by default**; the cut-off applies instantly without a rerun.
- **Pin button** on every row: pinned builds stay visible when a cut-off is set.

## v57
- **Pinned reference builds**, always shown: **SM Ruin (classic)**, **DS Ruin (classic)** and **Wrack DS**, each with its
  best priority. SM Ruin is now the best Affliction build.

## v56
- New priority action **Shadow Bolt (max rank) to keep ISB up**: Shadow Bolt until Improved Shadow Bolt is up, then back
  to the filler (for Fire builds with Shadow DoTs). Works, but loses 6–8% in the Destruction builds.

## v55
- **Life Tap while moving** (Fight & pets → Encounter): with movement on, idle time while moving becomes Life Taps.

## v54
- Talents re-checked with the new raid-buff defaults: four builds move points from mana talents into damage
  (Improved Shadow Bolt, Suppression, Malevolence, Improved Corruption).

## v53
- Built-in presets: **Default**, **Self-buffed** (no raid buffs, the old defaults) and **Full raid buffs + consumables**.

## v52
- **Raid buffs on by default**: Arcane Intellect, Mark of the Wild, Fortitude, Divine Spirit, Kings, Wisdom, Moonkin
  aura, plus Curse of Recklessness and Judgement of Wisdom on the boss.

## v51
- Nightfall procs always use the **max-rank Shadow Bolt**, even with a Rank 2 filler; action renamed to match.

## v50
- **Shadow Bolt Rank 2** as a filler option.
- The editor's action list is grouped (Curses & DoTs, Multi-target, Cooldowns & procs, Pet & mana, Fillers).

## v49
- Priority action **Bane of Agony only** (never Bane of Doom).

## v48
- Adding or editing a build only simulates that build; a full rerun only after a settings change.

## v47
- Improved Shadow Bolt needs its own hit roll after a Shadow Bolt crit.

## v46
- **End-of-fight DoT check**: DoTs near the end are only recast if they still pay off (option, on by default).
- Details card "DoTs at the end of the fight".

## v45
- Wording of the documentation and tooltips (no value changes).

## v44
- Hit cap 100% (17% usable hit).

## v43
- Disclaimer under the title removed.

## v42
- "Spells & damage" column: fixed-width layout, Bane of Doom / Agony in one split icon.

## v41
- **Spells & damage** column (priority icons with damage share bars), DPS bars, new details layout.

## v40
- Out-of-date results banner, one row per build (other races under ▸), **compare two builds**, **DoT chart**,
  execute-phase DPS, **gear sets**, **quick sim** and drag-and-drop priority in the editor, stat weights as spell-power
  equivalents, "Add this run to compare", Advanced sections.

## v39
- Talent damage bonuses of the same type add up, auras multiply; Improved Sayaad only raises Lash of Pain's base damage.

## v38
- Trainer spell ranks by default + **AQ20 book ranks** option; spell damage from the in-game values.
- Succubus melee with glancing blows and crit suppression; Eureka! capped at 15 s; Soul Link on Demonic Brand.

## v37
- Two-target fixes: the encounter preset stays selected, Bane of Havoc shown in the rotation.

## v36
- **Partial resists** and boss resistances, **travel time**, Curse of the Elements and Improved Shadow Bolt on extra
  targets; default Stamina 160 / MP5 0.

## v35
- **Eureka!** as a live +10% aura with pop-timing options; **Judgement of Wisdom** debuff.

## v34
- Default gear Int 148 / Spirit 54.

## v33
- The no-race baseline is hidden in the "Best race" view.

## v32
- **Mid-fight pet swap** at execute (sacrifice, Fel Domination, summon) and "Searing Pain in the execute phase".

## v31
- **Boss health lane** in the timeline (execute phase marked).

## v30
- Run button renamed **Sim!**.

## v29
- The Succubus's melee inherits your spell crit.

## v28
- Pet scaling measured in Forever (10% of your spell power, 1 AP per 6 SP); Demonic Knowledge now also buffs the pet.

## v27
- Beta changes: Eureka! mana −10%, Touch of the Grave on DoT casts, Wizard Oil 24; two builds retuned.

## v26
- "Best Demonology / Destruction" tags (the best build of every tree is always shown); narrower page.

## v25
- **No-race baseline** ("vs no race" column), best Affliction build always shown; renamed to Xn's Forever Warlock Sim.

## v24
- **Multi-DoT** on up to 3 targets.

## v23
- Wider page; priority icons no longer overlap the DPS.

## v22
- Amplify Curse fixed; option "Shadowburn only to keep Shadow and Flame up"; Soul Fire during Decimation in two builds.

## v21
- Drain Life build added; Spell Pierce marker in the rotation log.

## v20
- Talent reset buttons in the build editor.

## v19
- **Reset to defaults** for the Stats panel.

## v18
- **Build editor** with build codes, **presets**, **encounter options** (latency, movement, second target), mana
  summary, "pin as reference".

## v17
- **Reset to defaults** for buffs, consumables and fight settings.

## v16
- Succubus melee with Season of Discovery values; only builds within 10% of the best are shown.

## v15
- Pet spell power fixed (15% instead of 100%); new build list led by Succubus builds.

## v14
- DPET column, buff & debuff uptimes, **cast timeline**, DPS histogram and error margin, **share settings code**,
  **batch compare**, Engineering explosives.

## v13
- Settings split into a Stats panel and tabs; default gear 500 SP.

## v12
- One stats tab, smaller build list, consumable icon fixes, Minor Arcane Elixir.

## v11
- **Consumables** (flasks, elixirs, food, oils, potions, runes) and a total-stats view.

## v10
- Talent point audit (four builds improved); fights vary ±10% in length.

## v9
- Buff and debuff icons with tooltips; technical documentation.

## v8
- **Raid buffs and boss debuffs** (12 buffs, 5 debuffs, boss armor).

## v7
- **Hover tooltips** for talents, spells and racials; Spell Pierce weight column.

## v6
- **Talent trees** in the details, pet-scaling settings, default crit 10%.

## v5
- Stat weights per 1% instead of per rating; Demonic Brand and Amplify Curse added.

## v4
- Start-up fix; crit on the sheet counts before talents and racials again.

## v3
- **Build search**: a new build list with Imp builds; rotation search.

## v2
- **Pets as their own actors**, Spell Pierce, **stat weights**, new results layout.

## v1
- First version: every build × race simulated, DPS ranking, talents, spells, rotation log and stats per build.
