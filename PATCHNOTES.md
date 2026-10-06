# Patch notes — Xn's Forever Warlock Sim

What each version added or changed, newest first. Version = the version of the
[live page](https://claude.ai/artifact/WzHGwM25MtG9kXFG8rcW9W).

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
