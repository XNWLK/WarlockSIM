# How the sim calculates

This is the full rule book of [Xn's Forever Warlock Sim](https://xnwlk.github.io/WarlockSIM/): what is simulated, the exact
formula behind every number, and what each talent, spell, pet, racial, buff and consumable does in it.

- It describes what **the sim** does. Where the sim follows something that is not verified in WoW: Forever yet, the rule is
  marked *assumed*; section 16 lists all of those.
- The tables and the worked examples are written by a script from the sim's own data (`node tools/gen-mechanics.js`), so
  they always match the version of the sim they ship with.
- On the page you can check any of this yourself: click a build, and its details show the stats with where each number
  comes from, every spell's hits, crits and misses, and the complete log of one sample fight. Click a spell in that list
  and the page shows its calculation step by step with your own stats and settings.

**Contents:** 1 [The fight](#1-the-fight) · 2 [Your stats](#2-your-stats) · 3 [How a spell's damage is calculated](#3-how-a-spells-damage-is-calculated) ·
4 [Worked examples](#4-worked-examples) · 5 [Spells](#5-spells) · 6 [Talents](#6-talents) · 7 [Pets](#7-pets) ·
8 [Races and racials](#8-races-and-racials) · 9 [Mana](#9-mana) · 10 [Your health](#10-your-health) ·
11 [Resistance and Spell Pierce](#11-resistance-and-spell-pierce) · 12 [Threat](#12-threat) ·
13 [Raid buffs and boss debuffs](#13-raid-buffs-and-boss-debuffs) · 14 [Consumables and weapon stones](#14-consumables-and-weapon-stones) ·
15 [Priority lists, cooldowns and the builds](#15-priority-lists-cooldowns-and-the-builds) ·
16 [Results, and what is assumed or left out](#16-results-and-what-is-assumed-or-left-out)

---

## 1. The fight

A level-60 Warlock against a level-63 raid boss. One run simulates every build with every race many times and averages
the fights.

**Default settings**

<!-- gen:gear -->
- **Gear (character sheet, before talents, racials and weapon stone):** 500 spell power, 5% hit, 10% crit, 0% haste, Intellect 148, Spirit 54, Stamina 160, MP5 0, Spell Pierce 0.
- **Fight:** 120 s ± 10%, 1,000 fights per build and race, 1 target, execute phase below 35% boss health, healing on you 1,000 every 10 s.
- **Hit-capped preset:** 1,000 spell power, 17% hit, 20% crit, Intellect 250, Spirit 100, Stamina 300.
<!-- /gen:gear -->

**Length.** Each fight lasts the set duration plus or minus up to the variation, drawn evenly per fight. That keeps a
result from hinging on one exact length (for example whether one more Bane of Doom fits).

**Boss health** falls in a straight line from 100% to 0% over the fight. "Below 35% health" (the execute phase) is
therefore the last 35% of the fight's time.

**Random numbers.** The seed is fixed: the same settings always give the same result. Hit rolls, crit rolls, procs,
resist rolls and pet rolls each use their own stream, so changing one stat does not reshuffle the others.

**Casting**

- Cast time = the spell's cast time after talents ÷ (1 + haste %), and ÷ 1.10 on top of that while Berserking is up.
- Global cooldown = 1.5 s, shortened by haste and Berserking in the same way, never below 1.0 s. Every spell and Life
  Tap uses it, except the things listed as "off the global cooldown".
- Channels last their full duration, and DoTs keep their duration and tick interval: haste shortens neither.
- A spell's mana is paid when the cast starts. A spell that misses still costs its mana and its time.
- Direct damage uses the spell's average value; there is no minimum-to-maximum roll.
- A cooldown starts when the cast is complete, not when it begins (this matters for Soul Fire).
- A cast that finishes exactly at the end of the fight still counts. Ticks and hits after the end do not.

**Hitting.** One hit roll per cast: the spell misses with a chance of 100% − your hit chance. If a DoT lands, all of its
ticks land; a channel rolls once when it starts. Only the two area channels (Hellfire, Rain of Fire) roll for every tick
and every target.

**What you do at each moment.** Whenever you are free and the global cooldown is ready, the sim does this, in order:

1. With 2 or 3 targets and the Bane of Havoc talent: Bane of Havoc on target 2 if it is not up.
2. Mana Tide Totem and Innervate start the first time you are below 50% mana. Mana potions and runes are used when you
   are missing at least their amount.
3. Explosives are thrown when their cooldown is ready (Engineering).
4. The build's priority list is read from the top; the first action whose condition is met is taken (section 15).
5. If that spell does damage and you can afford it, your cooldowns are used first when their setting allows it (section 15).
6. If you cannot afford the spell: Life Tap instead (section 9).
7. Otherwise the spell is cast.

A channel is cut short after a tick when something higher in the priority list has become ready and the global cooldown
allows it.

**Optional encounter settings** (all off by default; Fight & pets on the page)

| Setting | What it does |
|---|---|
| Latency | Adds this delay after each of your casts and global cooldowns before the next action. |
| Travel time | Shadow Bolt, Soul Fire, Incinerate, Death Coil and the Imp's Firebolt land this much later. You are free to cast again at once. |
| Movement | From the first interval on, every "Move every" seconds you move for the set time. While moving only instants can be cast, and no cast or channel is started that would run into the next movement phase. Option: Life Tap while moving when nothing else can be cast. |
| Take a hit every (s) | You take a hit at this interval (the first at a random moment of the first interval). While casting, the cast is pushed back by 1.0 s, then 0.8, 0.6, 0.4 and 0.2 s for later hits on the same cast (0.2 s for every hit after that), never to more than a full cast from that moment. While channelling, the channel loses 25% of its full duration per hit. Intensity (Destruction spells), Fel Concentration (Drain Life, Drain Soul, Wrack) and Concentration Aura (35%, all spells) add up to a chance of at most 100% to ignore a hit. |
| Precast | A spell with a cast bar that you start before the pull so that it finishes as the fight timer starts. It lands at second 0, its cast time is not fight time, its mana is already spent and its cooldown runs from second 0. What is left of its global cooldown is carried into the fight. No cooldowns are used for it. |
| Targets (2 or 3) | Extra targets live for the whole fight and carry none of the boss's debuffs: each needs its own Curse of the Elements and its own Improved Shadow Bolt. Your own buffs still apply there. Wrack's and Soul Siphon's bonuses only work on the boss. |
| Multi-DoT | Keeps your curse and DoTs on the extra targets too (see the "multi-DoT" priority action). |

---

## 2. Your stats

The numbers you type on the page are your **character sheet with gear only**. The sim adds the race, raid buffs,
consumables, the weapon stone and each build's talents.

<!-- gen:races -->
Level-60 Warlock before the race: Intellect 110, Spirit 115, Stamina 65, base mana 1,373, base health 1,414.

| Race | Intellect | Spirit | Stamina | Racials in the sim |
|---|---|---|---|---|
| Human | 0 | 0 | 0 | The Human Spirit, Ruthless |
| Gnome | +3 | 0 | −1 | Expansive Mind, Eureka! |
| Orc | −3 | +3 | +2 | Savage, Blood Fury |
| Undead | −2 | +5 | +1 | Touch of the Grave |
| Troll | −4 | +1 | +1 | Berserking |
<!-- /gen:races -->

**Intellect, Spirit, Stamina**

```
stat = (base + race + gear + raid buffs + consumables) × percentage bonuses
```

- Percentage bonuses multiply with each other: Blessing of Kings +10% on all three; The Human Spirit +5% Spirit; Demonic
  Embrace +3 to 15% Stamina.

**Mana and health**

```
maximum mana   = (1,373 + 20 + 15 × (Intellect − 20)) × (1 + Fel Vitality % + Expansive Mind %)
maximum health =  1,414 + 20 + 10 × (Stamina − 20)
```

**Spell power**

```
spell power = gear + consumables + weapon oil + Demonic Knowledge (20 / 40 / 60, only with a demon out)
```

Shadow-only and Fire-only spell power (gear, the Spellstone or Firestone, Elixir of Shadow Power, Elixir of Fire Power)
is added for spells of that school. During the fight the Major Spellblasting Potion adds its spell power while it is up,
and Blood Fury multiplies the whole sum by 1.10.

**Hit**

```
hit chance = 83% + gear hit + Suppression + consumables, at most 100%
```

A level-63 boss is missed 17% of the time without any hit. All 17% can be removed: Forever has no permanent 1% miss.

**Crit**

```
crit chance = sheet crit
            + (Intellect above your sheet's Intellect) ÷ 60
            + raid buffs (Moonkin Form aura 3%)
            + consumables
            + Firestone 2% + weapon oil crit
            + Ruthless 2% (Human) or Savage 1% (Orc)
```

- 60 Intellect = 1% crit. The crit on your sheet already holds your own Intellect, so only the Intellect that buffs,
  consumables and Blessing of Kings add on top is converted.
- Elixir of the Owl and Elixir of Sages do not stack their 2% crit: together they give 2%.
- Per spell, talents add more: Malevolence (Shadow spells), Agonizing Flames (Searing Pain), Fire and Brimstone (Conflagrate).
- Option "Sheet crit % already includes talents, racials & oil": then Malevolence, the Firestone or oil crit, Ruthless and
  Savage are not added again. Raid buffs, consumables and the two spell-specific talents still are.

**Agility** does nothing: your demon crits with your spell crit (section 7), so the sim has no Agility.

**Haste** = gear + consumables + Spellstone 2%. Berserking is applied on top during the fight (section 1).

**MP5** = gear + Blessing of Wisdom 40 + Mana Spring Totem 25 (+6.25 with Restorative Totems) + consumables + weapon oil.
It is paid out evenly, 1/5 of it each second, also while casting.

---

## 3. How a spell's damage is calculated

```
a hit  = (base + coefficient × spell power) × (1 + direct talent group)   × auras × resist roll × crit
a tick = (base + coefficient × spell power) × (1 + periodic talent group) × auras × resist roll × crit
```

**Spell power** is your spell power for that spell's school at the moment the hit or tick lands. Forever's DoTs are
dynamic: nothing is stored when a DoT is cast, so a potion, Blood Fury or a new debuff changes the ticks that come after
it, and stops counting when it ends. (The one exception is Amplify Curse, which belongs to the Bane of Agony it was cast with.)

**Talent groups: these add up with each other.** Talents that say "increases the damage of your … spells" are added
together inside their group, and the group is applied once.

| Group | Talents in it |
|---|---|
| Direct (hits) | Shadow Mastery (Shadow spells) · Agonizing Flames (Destruction spells except Hellfire) · Aftermath (Immolate's hit) · Decimation (Shadow Bolt and Searing Pain while the boss is below 35%) · Eureka! (+10% for a cast that finishes while it is up) |
| Periodic (DoT and channel ticks) | Shadow Mastery (Shadow spells) · Agonizing Flames (Destruction spells except Hellfire) · Improved Corruption · Improved Bane of Agony · Improved Drains · Eureka! (+10%, channel ticks while it is up) |

Example: Corruption with 5/5 Improved Corruption and 5/5 Shadow Mastery gets × (1 + 10% + 10%) = × 1.20, not
1.10 × 1.10 = 1.21.

**Auras: each one multiplies.** Effects that say "increases your Shadow damage" or "damage taken":

| Aura | Size | Applies to |
|---|---|---|
| Demonic Sacrifice | +15% | Shadow (Imp sacrificed) or Fire (Succubus sacrificed) |
| Master Demonologist | +2 to 10% | Shadow with the Succubus out, Fire with the Imp out |
| Soul Link | +3% | everything, while a demon is out |
| Curse of the Elements | +10% | everything on a target that has the curse |
| Improved Shadow Bolt | +4 to 20% | your Shadow damage on a target that has the debuff |
| Shadow and Flame | +2 to 10% | Shadow for 20 s after a Conflagrate, Fire for 20 s after a Shadowburn |
| Power Infusion | +20% | everything, for 15 s |
| Wrack | +10% | the ticks of Corruption, Bane of Agony, Siphon Life and Bane of Doom while you channel Wrack |
| Soul Siphon | up to +36% | the ticks of Drain Life, Drain Soul and Wrack |
| Immolate on the target | +25% | Incinerate |

**Amplify Curse and Improved Sayaad** raise only the *base* of the spell (the number before the spell power part), not
the whole hit.

**Resist roll.** See section 11. At the default settings nothing is resisted once Curse of the Elements is on the boss.

**Crit.** Every hit and every tick rolls its own crit with that spell's crit chance, also DoT ticks, channel ticks and
the Bane of Doom explosion.

```
crit multiplier = 1 + 0.5 × (1 + Ruin % + Pandemic %)
```

That is × 1.5 without talents, × 2.0 with 5/5 Ruin on Destruction spells, and × 2.0 with 3/3 Pandemic on the spells
Pandemic names. No spell gets both: Ruin covers Destruction spells, Pandemic covers Affliction spells.

---

## 4. Worked examples

<!-- gen:examples -->
The examples use the build **Demo Pact Shadow Bolt Succubus** as an Undead with the default gear, raid buffs and boss debuffs. Every number below is checked against the sim's own value when this document is generated.

#### 1. The character's stats
- Intellect: (110 base − 2 Undead + 148 gear + 31 Arcane Intellect / Brilliance + 16 Mark / Gift of the Wild) × 1.10 Blessing of Kings = **333.3**
- Spirit: (115 base + 5 Undead + 54 gear + 16 Mark / Gift of the Wild + 40 Divine Spirit / Prayer of Spirit) × 1.10 Blessing of Kings = **253**
- Stamina: (65 base + 1 Undead + 160 gear + 16 Mark / Gift of the Wild + 70 Power Word: Fortitude) × 1.10 Blessing of Kings = **343.2**
- Maximum mana: (1,373 + 20 + 15 × (333.3 − 20)) × 1.15 Fel Vitality = **7,006.4**
- Maximum health: 1,414 + 20 + 10 × (343.2 − 20) = **4,666**
- Spell power: 500 gear + 60 Demonic Knowledge = **560**; Shadow spells: + 21 Major Spellstone = **581**
- Hit: 83 base against a level-63 boss + 1 Suppression + 5 gear = **89%**
- Crit: 10 sheet + 1.29 from 77.3 Intellect above the sheet ÷ 60 + 3 Moonkin Form aura = **14.29%**
- Haste: **2%** (Major Spellstone).

#### 2. Shadow Bolt
1. Base hit: 251 + 0.857 × 581 = 748.9
2. Direct talent group (these add up): Agonizing Flames +10% → × 1.10
3. Auras (each multiplies): 1.15 Demonic Sacrifice (Imp) × 1.10 Master Demonologist (Succubus) × 1.03 Soul Link = × 1.3029
4. Hit before the boss's debuffs: 748.9 × 1.10 × 1.3029 = **1,073.4**
5. With Curse of the Elements (× 1.10) and Improved Shadow Bolt (× 1.20) on the boss: **1,416.9**
6. A crit (chance 14.29%) deals × 2 with Ruin: **2,833.7**
7. Cast time: 3 s − 0.5 s Bane = 2.5 s, ÷ 1.02 haste = 2.45 s. It misses 11% of the time.

#### 3. Corruption
1. Base tick: 57 + 0.2 × 581 = 173.2
2. Periodic talent group: Improved Corruption +2% → × 1.02
3. Auras: × 1.3029 as above → **230.2** per tick
4. With the curse and Improved Shadow Bolt on the boss: **303.8** per tick, 6 ticks = 1,823.1 before crits
5. Every tick rolls its own crit (14.29%, × 1.5). The spell power is read at each tick, so a potion or Blood Fury that starts later still counts for the ticks after it.

#### 4. Bane of Doom
(1,742 + 4 × 581) × 1.3029 auras = **5,297.8**; with the curse and Improved Shadow Bolt on the boss **6,993.1**; a crit deals × 1.5.

#### 5. Touch of the Grave
4,666 health × 5% = **233.3**. Nothing multiplies it: no aura, no curse, no Improved Shadow Bolt, no Power Infusion. No spell power, no crit, no resist roll. 30% chance per landed damaging cast, then nothing for 25 s.

#### 6. The Succubus
- Attack table of one swing: miss 8% − (89 − 83 − 1)% = **3%**, dodge **6.5%**, glancing blow **40%** (at 65% damage), crit your spell crit 14.29 − 4.8 = **9.49%** (× 2), normal hit the remaining **41.01%**.
- Attack power from you: 560 spell power ÷ 6 = 93.4. Damage per second: 73.5 + 93.4 ÷ 14 = 80.17.
- Boss armor: 3,731 − armor debuffs = 976 → 976 ÷ (976 + 5,500) = 15.07% less physical damage.
- One normal swing: 80.17 × 2 s × (1 − 0.1507) × 1.10 Unholy Power × 1.03 Soul Link = **154.3**. Master Demonologist and Curse of the Elements do not apply to melee.
- Her spell power: 10% of 560 + 60 Demonic Knowledge = 116.
- Lash of Pain: (50 × 1.30 Improved Sayaad + 0.429 × 116) × 1.10 × 1.03 × 1.10 Master Demonologist × 1.10 curse = **157.3**; it crits with your spell crit (14.29%) for × 1.5.
- Demonic Brand hit: (66.5 + 0.078 × 581 Shadow spell power) × the same four multipliers = **153.3**. It cannot miss or crit.

#### 7. Life Tap
430 + 253 Spirit = **683 mana** for 430 health and one global cooldown (this build has no Improved Life Tap; with 2/2 it would be 819.6).

#### 8. Talents of one group add up: Immolate and Incinerate
Build **Destro Incinerate Succubus**, Undead, default settings; Fire spell power 500 + 21 Major Firestone = 521. No auras: this build has no Demonology points.
- Immolate's hit: (146 + 0.2 × 521) × (1 + 10% Agonizing Flames + 50% Aftermath) = 250.2 × 1.60 = **400.3**. The two talents add to 60%; they do not multiply to 65%.
- Immolate's burn, per tick: (52 + 0.13 × 521) × (1 + 10% Agonizing Flames) = **131.7**; 5 ticks.
- Incinerate: (217 + 0.714 × 521) × 1.10 Agonizing Flames = 647.9; × 1.25 with Immolate on the boss × 1.10 curse × 1.10 Shadow and Flame (after a Shadowburn) = **979.9**; a crit (16.29%) deals × 2.

#### 9. Resistance before the curse, and Spell Pierce
- Before Curse of the Elements is up the boss has 24 level resistance: on average 6% of each hit or tick is resisted - 76% of them lose 0%, 24% of them lose 25%.
- With the curse the resistance is 0 and nothing is resisted. With 15 Spell Pierce on top it is −15: on average +3.75% - 64.1% of hits gain 0%, 34.4% of hits gain 10%, 1.6% of hits gain 20%.
<!-- /gen:examples -->

---

## 5. Spells

Level-60 values. "SP" is your spell power for that spell's school. The damage values are the ones the spells deal in
Forever; the tooltip texts read a little higher (Shadow Bolt Rank 9 hits for 237 to 265, 251 on average, while its
tooltip says 246 to 274). A spell's "family" decides which talents count it as a Destruction or an Affliction spell.

<!-- gen:spells -->
| Spell | School | Family | Damage | Cast | Mana | Cooldown | Range |
|---|---|---|---|---|---|---|---|
| Shadow Bolt (Rank 9) | Shadow | Destruction | 251 + 0.857 × SP | 3 s | 370 | — | 30 yd |
| Immolate (Rank 7) | Fire | Destruction | 146 + 0.2 × SP, then 5 ticks of 52 + 0.13 × SP, one every 3 s | 2 s | 370 | — | 30 yd |
| Incinerate | Fire | Destruction | 217 + 0.714 × SP | 2.5 s | 325 | — | 30 yd |
| Searing Pain | Fire | Destruction | 114 + 0.429 × SP | 1.5 s | 168 | — | 30 yd |
| Conflagrate | Fire | Destruction | 282 + 0.429 × SP | instant | 255 | 10 s | 30 yd |
| Shadowburn | Shadow | Destruction | 266 + 0.429 × SP | instant | 365 | 15 s | 30 yd |
| Soul Fire | Fire | Destruction | 431 + 1 × SP | 6 s | 335 | 60 s | 30 yd |
| Hellfire (Rank 3) | Fire | Destruction | 15 ticks of 206 + 0.022 × SP, one every 1 s | channel, 15 s | 1300 | — | self |
| Rain of Fire (Rank 4) | Fire | Destruction | 4 ticks of 220 + 0.083 × SP, one every 2 s | channel, 8 s | 1185 | — | 30 yd |
| Corruption (Rank 6) | Shadow | Affliction | 6 ticks of 57 + 0.2 × SP, one every 3 s | 2 s | 290 | — | 30 yd |
| Bane of Agony | Shadow | Affliction | 12 ticks of 46 + 0.133 × SP, one every 2 s | instant | 215 | — | 30 yd |
| Bane of Doom | Shadow | Affliction | 1742 + 4 × SP, once, after 60 s | instant | 300 | 60 s | 30 yd |
| Bane of Havoc | Shadow | Affliction | — | instant | 69 | — | 30 yd |
| Siphon Life | Shadow | Affliction | 10 ticks of 41 + 0.05 × SP, one every 3 s | instant | 365 | — | 30 yd |
| Drain Life | Shadow | Affliction | 5 ticks of 51 + 0.1 × SP, one every 1 s | channel, 5 s | 300 | — | 20 yd |
| Drain Soul | Shadow | Affliction | 5 ticks of 84 + 0.1 × SP, one every 3 s | channel, 15 s | 290 | — | 30 yd |
| Wrack | Shadow | Affliction | 6 ticks of 36 + 0.143 × SP, one every 1 s | channel, 6 s | 200 | — | 30 yd |
| Death Coil | Shadow | Affliction | 454 + 0.214 × SP | instant | 600 | 120 s | 30 yd |
| Curse of the Elements | Shadow | Affliction | — | instant | 200 | — | 30 yd |
| Life Tap | Shadow | Affliction | — | instant | 430 health | — | self |

**Destruction spells** (Ruin, Agonizing Flames, Cataclysm, Intensity): Shadow Bolt, Immolate, Incinerate, Searing Pain, Conflagrate, Shadowburn, Soul Fire, Hellfire, Rain of Fire.
**Affliction spells:** Corruption, Bane of Agony, Bane of Doom, Siphon Life, Drain Life, Drain Soul, Wrack, Death Coil.

- **Shadow Bolt.** A crit applies Improved Shadow Bolt (with the talent). No cast time under Shadow Trance. A hit while the boss is below 35% health triggers Decimation (with the talent). Projectile.
- **Immolate.** A direct hit plus a 15 s burn. Aftermath only raises the hit. Conflagrate needs it on the target, and Incinerate deals 25% more while it is there.
- **Incinerate.** 25% more damage if your Immolate is on the target when it lands. Projectile.
- **Searing Pain.** Causes twice its damage as threat. Applies Demonic Brand (with the talent and a demon out). A hit while the boss is below 35% health triggers Decimation (with the talent).
- **Conflagrate.** Can only be cast with your Immolate on the target and consumes it - unless Shadow and Flame keeps it.
- **Shadowburn.** Uses a soul shard; shards never run out in the sim.
- **Soul Fire.** Its cooldown starts when the cast is complete. Uses a soul shard (unlimited). With the Decimation buff: faster cast, no shard. Projectile.
- **Hellfire.** Channel. Every tick hits every target of the fight (each with its own hit, crit and resist roll) and hits you for the tick's value before talents (206 + 0.022 × SP), without a crit, reduced by Molten Skin and Soul Link. Only started when your health covers the whole channel, counting the heals due during it; it stops early if the next tick would kill you. Agonizing Flames does not apply.
- **Rain of Fire.** Channel. Every tick hits every target of the fight (each with its own hit, crit and resist roll). Agonizing Flames applies.
- **Corruption.** A DoT with a cast time, unless Improved Corruption makes it instant.
- **Bane of Agony.** The ticks ramp up: ticks 1-4 deal 50%, ticks 5-8 100% and ticks 9-12 150% of the tick value in the table. One Bane per target.
- **Bane of Doom.** One hit after 60 s. It counts as a periodic tick (periodic talent group, it can crit). Only cast when at least 60 s of the fight are left. One Bane per target.
- **Bane of Havoc.** Off the global cooldown; only cast with 2 or 3 targets, on target 2. While it is up, 15% of what you deal to the other targets is also dealt to target 2.
- **Siphon Life.** A DoT that heals you for the damage it deals.
- **Drain Life.** Channel; heals you for the damage it deals.
- **Drain Soul.** Listed because talents name it. No priority action casts it.
- **Wrack.** Channel. While it runs, the ticks of your Corruption, Bane of Agony, Siphon Life and Bane of Doom deal 10% more. It counts as a drain for Improved Drains, Soul Siphon, Fel Concentration and Nightfall.
- **Death Coil.** Heals you for the damage it deals. Projectile.
- **Curse of the Elements.** Has to hit. On the target for 5 minutes: it takes 10% more damage from your spells, your demon's spells and your explosives, and its resistance drops by 75 (which removes the level resistance).
- **Life Tap.** Instant, one global cooldown: 430 health become (430 + Spirit) mana, more with Improved Life Tap. It does not restart the 5-second rule.
<!-- /gen:spells -->

**Book ranks.** The table uses the highest trainer ranks. With the option "AQ20 book ranks" three spells use the ranks
taught by the books from Ruins of Ahn'Qiraj:

<!-- gen:bookranks -->
| Spell | Trainer rank (default) | Book rank (option) |
|---|---|---|
| Shadow Bolt | Rank 9: 251 + 0.857 × SP; 370 mana | Rank 10: 268 + 0.857 × SP; 380 mana |
| Immolate | Rank 7: 146 + 0.2 × SP, then 5 ticks of 52 + 0.13 × SP, one every 3 s; 370 mana | Rank 8: 158 + 0.2 × SP, then 5 ticks of 55 + 0.13 × SP, one every 3 s; 380 mana |
| Corruption | Rank 6: 6 ticks of 57 + 0.2 × SP, one every 3 s; 290 mana | Rank 7: 6 ticks of 73 + 0.2 × SP, one every 3 s; 340 mana |
<!-- /gen:bookranks -->

**DoTs in general.** A DoT is recast when it is missing or would run out before the new cast lands. A recast replaces the
running DoT: the new one starts its own ticks. Near the end of the fight a DoT is only recast if what it still adds beats
the filler in the same time (section 15).

**Not in the sim:** Seed of Corruption, Drain Mana, Health Funnel, and the curses other than Curse of the Elements.

---

## 6. Talents

Every talent of the three trees. "Talent group" and "aura" are explained in section 3.

### Affliction

<!-- gen:talents-affliction -->
| Talent | Points | Value per point | What it does in the sim |
|---|---|---|---|
| Improved Life Tap | 2 | Life Tap mana +10 / 20% | Life Tap gives (430 + Spirit) × 1.10 / 1.20 mana. Its health cost stays 430. |
| Suppression | 5 | hit +1 / 2 / 3 / 4 / 5%; threat −4 / 8 / 12 / 16 / 20% | Adds to your hit chance. Your pet's spells use your hit chance too, and its melee misses less (see Pets). Also lowers all the threat you cause. |
| Improved Corruption | 5 | Corruption cast −0.4 / 0.8 / 1.2 / 1.6 / 2 s; Corruption damage +2 / 4 / 6 / 8 / 10% | Shortens Corruption's 2 s cast (instant at 5 points) and adds to Corruption's periodic talent group. |
| Grim Reach | 2 | range +10 / 20% | No effect on damage: the boss is always in range. The longer range (Affliction spells) is only listed. |
| Soul Harvesting | 2 | — | Not simulated: it needs an enemy dying under your Drain Soul. |
| Improved Drains | 3 | drain damage +7 / 13 / 20% | Adds to the periodic talent group of Drain Life, Drain Soul and Wrack. |
| Improved Bane of Agony | 2 | Bane of Agony damage +5 / 10% | Adds to Bane of Agony's periodic talent group. |
| Fel Concentration | 3 | pushback ignored 23 / 47 / 70% | Only matters when "Take a hit every (s)" is set: chance to ignore the pushback on Drain Life, Drain Soul and Wrack. |
| Amplify Curse | 1 | Bane of Agony base +50% | Used with every Bane of Agony cast while its 3-minute cooldown is ready (off the global cooldown). That Bane of Agony's base value is 50% higher for all 12 ticks; the spell-power part is not raised. Never used on Bane of Doom. |
| Pandemic | 3 | crit bonus +33 / 67 / 100% | Crits of Corruption, Bane of Agony, Bane of Doom, Drain Soul, Drain Life, Siphon Life and Wrack deal ×1.665 / ×1.835 / ×2.0 instead of ×1.5. |
| Malevolence | 5 | Shadow crit +1 / 2 / 3 / 4 / 5% | Adds to the crit chance of every Shadow spell of yours. Not added when "Sheet crit % already includes talents, racials & oil" is ticked. |
| Nightfall | 2 | chance per tick 2 / 4% | Every tick of Corruption, Drain Soul, Drain Life and Wrack has this chance to give Shadow Trance for 10 s: your next Shadow Bolt has no cast time (it still costs its mana and a global cooldown). |
| Curse of Exhaustion | 1 | — | Not simulated (a movement slow). |
| Siphon Life | 1 | — | Gives the spell Siphon Life. |
| Soul Siphon | 3 | per effect +4 / 8 / 12%; maximum +12 / 24 / 36% | Multiplies the ticks of Drain Life, Drain Soul and Wrack by 1 + this much for each of these on the target: Corruption, Bane of Agony, Bane of Doom, Siphon Life, Curse of the Elements - up to the maximum. A multiplier of its own. |
| Shadow Mastery | 5 | Shadow damage +2 / 4 / 6 / 8 / 10% | Adds to the direct and the periodic talent group of every Shadow spell of yours. Not applied to Touch of the Grave or to pets. |
| Wrack | 1 | — | Gives the spell Wrack. |
<!-- /gen:talents-affliction -->

### Demonology

<!-- gen:talents-demonology -->
| Talent | Points | Value per point | What it does in the sim |
|---|---|---|---|
| Improved Health Funnel | 2 | — | Not simulated (Health Funnel is never cast). |
| Improved Imp | 3 | Firebolt +10 / 20 / 30% | Multiplies the Imp's whole Firebolt hit by 1.10 / 1.20 / 1.30. Fire Shield is not simulated. |
| Demonic Embrace | 5 | Stamina +3 / 6 / 9 / 12 / 15% | Multiplies your Stamina. That only matters for your health and for Touch of the Grave. |
| Unholy Power | 5 | demon damage +2 / 4 / 6 / 8 / 10% | Multiplies everything your demon deals: melee, Firebolt, Lash of Pain and the Demonic Brand hit. |
| Demonic Aegis | 2 | — | Not simulated (armor spells). |
| Improved Voidwalker | 3 | — | Not simulated. |
| Fel Vitality | 3 | maximum mana +5 / 10 / 15% | Multiplies your maximum mana (it adds with the Gnome's Expansive Mind) and your demon's maximum mana. Demon health is not simulated. |
| Demonic Energies | 2 | heal (not simulated) 8 / 15%; Life Tap mana to the demon 50 / 100% | When you Life Tap, your demon gains 50 / 100% of the mana you actually gained (after the cap at your maximum mana). The healing part is not simulated. |
| Improved Sayaad | 3 | Lash of Pain base +10 / 20 / 30% | Raises Lash of Pain's base value by 10 / 20 / 30%; its spell-power part is not raised. The other spells are not simulated. |
| Demonic Sacrifice | 1 | Shadow / Fire damage +15% | The demon is sacrificed before the pull. Imp: +15% Shadow damage. Succubus: +15% Fire damage (auras: they multiply). Voidwalker: 2% of your maximum mana every 4 s. Felhunter: 3% of your maximum health every 4 s. Without Demonic Pact it only counts with no demon out. |
| Master Summoner | 2 | — | Only used by the mid-fight pet swap: summon 2 / 4 s faster and 20 / 40% cheaper. |
| Decimation | 2 | Soul Fire cooldown −45 / 90%; damage below 35% +3 / 6%; Soul Fire cast −20 / 40% | Soul Fire's cooldown is 45 / 90% shorter (60 s becomes 33 s / 6 s). A Shadow Bolt or Searing Pain that lands while the boss is below 35% health deals 3 / 6% more (added to the direct talent group) and gives a 10 s buff: the next Soul Fire casts 20 / 40% faster and needs no soul shard. |
| Fel Domination | 1 | — | Only used by the mid-fight pet swap: summon 6 s faster and 50% cheaper, 5 min cooldown. |
| Demonic Brand | 3 | Searing Pain threat −17 / 33 / 50%; charges 2 / 4 / 6 | With a demon out, a landed Searing Pain brands the boss for 10 s with 2 / 4 / 6 charges. Each landed attack of your demon spends a charge and adds a bonus hit (see Pets). Searing Pain causes 17 / 33 / 50% less threat. |
| Improved Felhunter | 3 | — | Not simulated. |
| Soul Link | 1 | damage +3%; damage to yourself −30% | While a demon is out: you and the demon deal 3% more (an aura: it multiplies), and the damage you do to yourself (Hellfire, Demonic Rune, Goblin Sapper) is 30% lower. Nothing of it after the demon is sacrificed. |
| Demonic Knowledge | 3 | spell power: 33 / 67 / 100% of your level | While a demon is out: +20 / 40 / 60 spell power for you, and the same amount on top of the demon's own spell power. |
| Master Demonologist | 5 | Shadow / Fire damage +2 / 4 / 6 / 8 / 10% | Succubus out: more Shadow damage for you and for her. Imp out: more Fire damage for you and for the Imp. An aura: it multiplies. Voidwalker and Felhunter: no damage effect. |
| Demonic Pact | 1 | — | Keeps the Demonic Sacrifice bonus while a different demon is out. |
<!-- /gen:talents-demonology -->

### Destruction

<!-- gen:talents-destruction -->
| Talent | Points | Value per point | What it does in the sim |
|---|---|---|---|
| Destructive Reach | 2 | range +10 / 20% | No effect on damage: the boss is always in range. The longer range (Destruction spells) is only listed. |
| Improved Shadow Bolt | 5 | Shadow damage taken +4 / 8 / 12 / 16 / 20% | Every Shadow Bolt crit puts the debuff on that target for 12 s: your Shadow damage on it is this much higher - hits and ticks. No charges; a new crit restarts the 12 s. Another Warlock's debuff does not count for you, and demons do not benefit. |
| Bane | 5 | cast −0.1 / 0.2 / 0.3 / 0.4 / 0.5 s; Soul Fire cast −0.4 / 0.8 / 1.2 / 1.6 / 2 s | Shorter cast of Shadow Bolt, Immolate and Incinerate (first values) and of Soul Fire (second values), before haste. |
| Molten Skin | 5 | damage to yourself −2 / 4 / 6 / 8 / 10% | Lowers the damage you do to yourself (Hellfire, Demonic Rune, Goblin Sapper). Multiplies with Soul Link. Life Tap is not reduced. |
| Cataclysm | 3 | mana cost −3 / 6 / 10% | Lowers the mana cost of every Destruction spell. |
| Aftermath | 5 | Immolate hit +10 / 20 / 30 / 40 / 50% | Adds to the direct talent group of Immolate's initial hit (not its burn). The daze is not simulated. |
| Ruin | 5 | crit bonus +20 / 40 / 60 / 80 / 100% | Crits of Destruction spells deal ×1.6 / 1.7 / 1.8 / 1.9 / 2.0 instead of ×1.5. |
| Shadowburn | 1 | — | Gives the spell Shadowburn. |
| Intensity | 3 | pushback ignored 23 / 47 / 70% | Only matters when "Take a hit every (s)" is set: chance to ignore the pushback on Destruction spells. |
| Agonizing Flames | 3 | Searing Pain crit +3 / 7 / 10%; Destruction damage +3 / 7 / 10% | More crit chance for Searing Pain, and the damage value is added to both talent groups of every Destruction spell: direct hits and ticks (Immolate's burn, Rain of Fire) - except Hellfire. |
| Conflagrate | 1 | — | Gives the spell Conflagrate. |
| Pyroclasm | 2 | — | Not simulated (stuns). |
| Bane of Havoc | 1 | — | Only with 2 or 3 targets: Bane of Havoc sits on target 2, and 15% of everything you (not your demon) deal to the other targets is dealt to it as well. |
| Fire and Brimstone | 3 | Conflagrate crit +8 / 17 / 25% | Adds to Conflagrate's crit chance. |
| Shadow and Flame | 5 | Shadow / Fire damage +2 / 4 / 6 / 8 / 10%; chance 20 / 40 / 60 / 80 / 100% | A landed Conflagrate gives this much more Shadow damage for 20 s, a landed Shadowburn this much more Fire damage for 20 s (auras: they multiply). Second values: the chance that Conflagrate does not consume Immolate, and that Shadowburn refunds its soul shard. |
| Incinerate | 1 | — | Gives the spell Incinerate. |
<!-- /gen:talents-destruction -->

---

## 7. Pets

Demons are simulated as their own actors: they cast, swing, miss, crit and run out of mana on their own, from second 0.

<!-- gen:pets -->
| Demon | Spell | Melee | Mana |
|---|---|---|---|
| Imp | Firebolt: 44 + 0.571 × demon SP, Fire, 2 s cast, 115 mana | — | 2,000, +8 per second |
| Succubus | Lash of Pain: 50 + 0.429 × demon SP, Shadow, instant, 12 s cooldown, 160 mana | 73.5 base DPS, one swing every 2 s, crit = your spell crit, 5 yd range | 2,000, +8 per second |
| Felhunter | — | 40 base DPS, one swing every 2 s, crit = your spell crit | 2,000, +8 per second |
| Voidwalker | — | 30 base DPS, one swing every 2 s, crit = your spell crit | 2,000, +8 per second |
<!-- /gen:pets -->

**What a demon gets from you** (measured in Forever)

- Spell power: 10% of your spell power (10 of yours = 1 for the demon), plus Demonic Knowledge's 20 / 40 / 60 in full.
- Attack power: your spell power ÷ 6. 14 attack power = 1 damage per second.
- Both follow your spell power as it is at that moment, including the Spellblasting potion and Blood Fury. Shadow-only or
  Fire-only spell power does not count for these.
- Spell hit = your hit chance. Crit, for spells and melee alike = your spell crit chance (without spell-specific talents
  such as Malevolence); a demon has no crit of its own. A demon's spell crit deals × 1.5.

**Damage multipliers of a demon:** Unholy Power × Soul Link × Master Demonologist (only the school it names: the
Succubus' Shadow, the Imp's Fire) × Curse of the Elements (spells only, not melee). Demons get nothing from Improved
Shadow Bolt, Shadow and Flame, Demonic Sacrifice or Spell Pierce, and their damage is never resisted.

**Imp.** Casts Firebolt back to back (2 s cast, not shortened by haste) for as long as it has mana. Improved Imp multiplies
the whole hit.

```
Firebolt = (44 + 0.571 × demon spell power) × (1 + Improved Imp) × demon multipliers
```

At 115 mana per cast and 8 mana per second, the Imp's 2,000 mana (more with Fel Vitality) lasts about 40 to 46 seconds.
Demonic Energies refills it from your Life Taps, and Judgement of Wisdom gives it 59 mana on half of its hits.
*Mana pool and regeneration are assumed.*

**Succubus.** Uses Lash of Pain every 12 s and swings every 2.0 s.

```
Lash of Pain = (50 × (1 + Improved Sayaad) + 0.429 × demon spell power) × demon multipliers
one swing    = (73.5 + attack power from you ÷ 14) × 2.0 s × (1 − armor reduction) × Unholy Power × Soul Link
```

Each swing is one roll on this table, in this order:

| Outcome | Chance |
|---|---|
| Miss | 8% − (your hit chance − 83% − 1%), not below 0. The first 1% of hit above the base does not count. |
| Dodge | 6.5% |
| Glancing blow | 40%, deals 65% damage, cannot crit |
| Crit | your **spell** crit − 4.8%; deals × 2 |
| Normal hit | the rest |

*Her base damage of 73.5 per second is a Season of Discovery value (assumed).* The table is the
Classic one for a level-63 boss attacked from behind.

**Boss armor** only matters for demon melee:

```
armor = 3,731 − Sunder Armor or Expose Armor (2,250) − Faerie Fire or Curse of Recklessness (505)
physical damage reduction = armor ÷ (armor + 5,500)
```

Sunder and Expose do not stack with each other, nor do Faerie Fire and Curse of Recklessness.

**Felhunter and Voidwalker** only swing (their abilities are not simulated); they crit with your spell crit, like the Succubus.
*Their melee values are assumed.*

**Demonic Brand** (talent). A landed Searing Pain brands the boss for 10 s with 2 / 4 / 6 charges. Every landed attack of
your demon (a swing, a Firebolt, a Lash of Pain) spends one charge and adds:

```
Demonic Brand hit = (66.5 + 0.078 × your Shadow spell power) × demon multipliers
```

It is Fire for the Imp and Shadow for the Succubus, so Master Demonologist counts for both. It cannot miss or crit.

**Shaman totems.** Windfury Totem and Flametongue Totem only affect players, so they do nothing for your demon. Grace of
Air Totem is gone as well: Agility does nothing, because demons crit with your spell crit.

**Judgement of Wisdom** on the boss gives the demon 59 mana on 50% of its landed swings and spells.

**Demonic Sacrifice.** See the talent. The sacrificed demon is gone before the pull; with Demonic Pact a different demon
can be out next to the bonus.

**Mid-fight pet swap** (a priority action, off by default). At the first decision in the execute phase: Demonic Sacrifice
on the demon that is out and Fel Domination (both off the global cooldown), then the other demon is summoned. The summon
takes 10 s − 6 s (Fel Domination) − 2 / 4 s (Master Summoner) and costs 80% (Imp) or 100% (Succubus) of base mana, reduced
by 50% (Fel Domination) plus 20 / 40% (Master Summoner): with both, an instant Imp for about 110 mana. The new demon has
full mana and acts at once; all your bonuses switch to the new setup, and running DoTs carry on with the new bonuses.

---

## 8. Races and racials

Stat differences are in the table in section 2. The page also shows every build with "No race": Human stats and no
racials, so you can read off what each race adds.

| Racial | In the sim |
|---|---|
| The Human Spirit (Human) | Spirit × 1.05. |
| Ruthless (Human) | +2% spell crit (your demon crits with it too). |
| Expansive Mind (Gnome) | Maximum mana +5% (adds with Fel Vitality). |
| Eureka! (Gnome) | 2 min cooldown, 8 s. Every damaging spell that finishes while it is up costs 10% less mana and deals +10%, added to its talent group (section 3): a spell with a cast time when the cast is complete, an instant when it is cast. A cast that is still going when the 8 s end gets nothing. A channel costs 10% less when it starts inside the 8 s, and each of its ticks that comes while Eureka! is up gets +10%. DoT ticks get nothing. The sim starts Eureka! right before a direct spell or channel of at least 1.4 s. |
| Savage (Orc) | +1% spell crit (your demon crits with it too). |
| Blood Fury (Orc) | 3 min cooldown, 15 s: your spell power × 1.10. That also raises what your demon gets from you, and a Bane of Doom that explodes while it is up. |
| Berserking (Troll) | 3 min cooldown, 10 s: 10% haste. Shortens casts and the global cooldown. |
| Touch of the Grave (Undead) | Each landed cast of a damaging spell (a direct spell, a DoT when it is applied, a channel when it starts - never a tick, a curse or Life Tap) has a 30% chance to deal 5% of your maximum health as Shadow damage and heal you for the same amount. After it happens it cannot happen again for 25 s. |

**Touch of the Grave in full.**

```
damage = 5% of maximum health
```

Nothing multiplies it: no talent, no aura (Demonic Sacrifice, Master Demonologist, Soul Link), no debuff on the target
(Curse of the Elements, Improved Shadow Bolt), no Shadow and Flame, no Power Infusion. It scales with Stamina, not with
spell power. It cannot crit and is never resisted.

The three cooldown racials are used together with your other cooldowns (section 15), and only right before a spell that
does damage - never before a curse or a Life Tap.

---

## 9. Mana

You start at full mana.

**Life Tap.** `mana gained = (430 + Spirit) × (1 + Improved Life Tap 10 / 20%)`, for 430 health and one global cooldown.
The sim taps by itself whenever the spell it wants to cast costs more than you have. A build can also tap early (the
priority action "Life Tap when mana is below …%"), or to feed the demon (Demonic Energies).

**Spirit regeneration and the 5-second rule.** While you have spent no mana for 5 seconds you regenerate

```
(8 + Spirit ÷ 4) mana every 2 seconds
```

- A spell with a cast time counts as spent when its cast is complete; an instant or a channel when it starts.
- Life Tap does not count as spending mana.
- Nothing regenerates while you channel (drains, Wrack, Hellfire, Rain of Fire) or while Innervate runs.
- The mana is added smoothly, not in 2-second steps.

**Other mana sources**

| Source | Rule |
|---|---|
| MP5 | 1/5 of it every second, always. |
| Judgement of Wisdom | 50% chance for 59 mana on every landed spell you cast at the boss (also a curse, a DoT being applied, a channel starting; not ticks, not Life Tap). |
| Mana Tide Totem | Once, the first time you are below 50% mana: 4 × 290 mana, 3 s apart. |
| Innervate | Once, the first time you are below 50% mana: 10 times 5 × (8 + Spirit ÷ 4) mana, 2 s apart. |
| Mana potion / Demonic Rune | Used when you are missing at least what they restore; 2 min cooldown each (potions share one, the rune has its own). |
| Voidwalker sacrifice | 2% of your maximum mana every 4 s. |

**Costs.** Cataclysm lowers the cost of Destruction spells by 3 / 6 / 10%. Eureka! lowers the spells that finish while it
is up by 10%. A Soul
Fire under Decimation costs its normal mana (only the shard is free). Soul shards never run out.

---

## 10. Your health

Your health is simulated so that Life Tap and Hellfire cannot be used without limit. The boss does not hit you.

| Costs you health | Amount |
|---|---|
| Life Tap | 430. Not reduced by anything. |
| Hellfire | Each tick hits you for the tick's value before talents. |
| Demonic Rune | 800 |
| Goblin Sapper Charge | 500 on average (375 to 625) |

Molten Skin (2% per point) and Soul Link (30% while a demon is out) reduce the last three; together they multiply to
37%: the rune then costs 504, a Sapper 315.

| Gives you health | Amount |
|---|---|
| Healing you receive | 1,000 every 10 s by default (both adjustable; 0 = nobody heals you) |
| Drain Life, Siphon Life, Death Coil, Touch of the Grave | their damage |
| Felhunter sacrifice | 3% of your maximum health every 4 s |

Nothing may kill you: a Life Tap waits for health, a rune or Sapper is not used without enough health (for the Sapper:
more than its biggest hit), and Hellfire is only started when your health, plus the heals due during it, covers the
whole channel.

---

## 11. Resistance and Spell Pierce

```
resistance = (boss resistance for the school + 24 level resistance − 75 with Curse of the Elements, not below 0)
             − your Spell Pierce
```

- A boss three levels above you has 24 resistance to everything (8 per level). Curse of the Elements removes it.
  The boss's own Shadow and Fire resistance are 0 by default.
- **Resistance above 0:** each hit and tick is resisted by 0, 25, 50, 75 or 100%. On average `0.25% × resistance` is
  lost (at most 75%). So before the curse is up, 6% of your damage is resisted on average.
- **Resistance below 0** (only possible with Spell Pierce): each hit and tick gains 0%, 10%, 20% … "vulnerable" damage,
  on average `0.25% × the resistance below 0`. *The size of this bonus is assumed.*
- **Exactly 0:** no roll at all. That is the default once the curse is on the boss.

Demons, explosives and Touch of the Grave are never resisted and get nothing from Spell Pierce.

---

## 12. Threat

The sim reports your threat per second; it does not check it against a tank.

```
threat = damage × (1 − Suppression 4% per point) × (1 − Salvation 30%) × spell factor
```

- Spell factor: 2 for Searing Pain, lowered by Demonic Brand's 17 / 33 / 50%; 1 for everything else.
- The copy Bane of Havoc makes of your damage counts. Your demon's damage is the demon's threat, not yours.
- Not counted: threat from healing yourself, from gaining mana and from applying curses.

---

## 13. Raid buffs and boss debuffs

<!-- gen:buffs -->
| Buff | From | Default | Effect in the sim |
|---|---|---|---|
| Arcane Intellect / Brilliance | Mage | on | +31 Intellect |
| Mark / Gift of the Wild | Druid | on | +16 all attributes |
| Power Word: Fortitude | Priest | on | +70 Stamina (Touch of the Grave) |
| Divine Spirit / Prayer of Spirit | Priest | on | +40 Spirit (Life Tap) |
| Blessing of Kings | Paladin | on | +10% total stats |
| Concentration Aura | Paladin | off | 35% chance to ignore pushback from damage |
| Blessing of Wisdom | Paladin | on | 40 mana every 5 s |
| Mana Spring Totem | Shaman | off | 10 mana every 2 s (25 MP5) |
| Restorative Totems (on Mana Spring) | Shaman | off | Mana Spring +25% |
| Mana Tide Totem | Shaman | off | 290 mana every 3 s for 12 s, once, when you drop below 50% mana |
| Innervate | Druid | off | 5× mana regen while casting for 20 s, once, when you drop below 50% mana |
| Moonkin Form aura | Druid | on | +3% spell crit (raid) |
| Salvation | Paladin | off | −30% threat |
| Power Infusion | Priest | off | +20% spell damage for 15 s (3 min cooldown); cast on you when you pop your cooldowns |
<!-- /gen:buffs -->

- **Totems.** Windfury Totem and Flametongue Totem are not in the list: they only affect players, not your demon.
- **Power Infusion** is cast on you when you use your cooldowns (section 15) and again whenever it is ready.
- Buffs that are personal in Forever are not available to you from others: Shadow Weaving, Improved Scorch, Winter's
  Chill, Stormstrike and another Warlock's Improved Shadow Bolt.
- Forever has no world buffs.

<!-- gen:debuffs -->
| Debuff | From | Default | Effect in the sim |
|---|---|---|---|
| Sunder Armor ×5 | Warrior | on | −2250 armor (does not stack with Expose Armor) |
| Expose Armor (5 points) | Rogue | off | −2250 armor (does not stack with Sunder Armor) |
| Faerie Fire | Druid | on | −505 armor (does not stack with Curse of Recklessness) |
| Curse of Recklessness | Warlock | off | −505 armor, from another Warlock (does not stack with Faerie Fire) |
| Curse of the Elements (another Warlock) | Warlock | off | Up all fight; you skip casting it |
| Judgement of Wisdom | Paladin | on | 50% chance per landed spell or pet attack: +59 mana to the attacker |
<!-- /gen:debuffs -->

---

## 14. Consumables and weapon stones

Only one consumable of each kind can be active; the last column shows which ones exclude each other. *Which consumables
exclude each other in Forever is assumed.*

<!-- gen:consumables -->
| Consumable | Kind | Default | Effect in the sim | Cannot be combined with |
|---|---|---|---|---|
| Flask of Supreme Power | Flask | off | +150 spell damage | Flask of Natural Accuracy, Flask of Natural Aggression, Flask of Natural Swiftness |
| Flask of Natural Accuracy | Flask | off | +60 Sta, +5% hit (Hyjal / Barrow Deeps only) | Flask of Supreme Power, Flask of Natural Aggression, Flask of Natural Swiftness |
| Flask of Natural Aggression | Flask | off | +60 Sta, +4% crit (Hyjal / Barrow Deeps only) | Flask of Supreme Power, Flask of Natural Accuracy, Flask of Natural Swiftness |
| Flask of Natural Swiftness | Flask | off | +60 Sta, +5% haste (Hyjal / Barrow Deeps only) | Flask of Supreme Power, Flask of Natural Accuracy, Flask of Natural Aggression |
| Greater Arcane Elixir | Elixir | off | +35 spell damage | — |
| Elixir of Shadow Power | Elixir | off | +40 Shadow spell damage | — |
| Elixir of Fire Power | Elixir | off | +10 Fire spell damage | — |
| Elixir of the Owl | Elixir | off | +25 Intellect, +2% crit (the crit does not stack with Elixir of Sages) | — |
| Elixir of Sages | Elixir | off | +25 Spirit, +2% crit (the crit does not stack with Elixir of the Owl) | — |
| Greater Mageblood Elixir | Elixir | off | 20 mana every 5 s | — |
| Spirit of Zanza | Elixir | off | +50 Spirit, +50 Stamina | — |
| Cerebral Cortex Compound | Elixir | off | +25 Intellect | — |
| Nightfin Soup | Food | off | Well fed: +22 spell damage | Runn Tum Tuber Surprise |
| Runn Tum Tuber Surprise | Food | off | Well fed: +15 Intellect | Nightfin Soup |
| Kreeg's Stout Beatdown | Food | off | +25 Spirit, −5 Intellect | — |
| Spellstone / Firestone (per build) | Weapon | on | Shadow builds: +2% haste, +21 Shadow SP · Fire builds: +2% crit, +21 Fire SP | — |
| Brilliant Wizard Oil | Weapon | off | +36 spell damage, +1% crit | — |
| Major Mana Potion | Potion | off | 1800 mana, 2 min cooldown | Restored Mana Potion, Major Spellblasting Potion |
| Restored Mana Potion | Potion | off | 20% of maximum mana, 2 min cooldown | Major Mana Potion, Major Spellblasting Potion |
| Major Spellblasting Potion | Potion | off | +47 spell damage for 30 s (2 min cooldown); popped with your other cooldowns | Major Mana Potion, Restored Mana Potion |
| Goblin Sapper Charge | Engineering | off | 450–750 Fire, 5 min cooldown; 375–625 damage to you | — |
| Dense Dynamite | Engineering | off | 340–460 Fire, 1 min cooldown | Thorium Grenade |
| Thorium Grenade | Engineering | off | 300–500 Fire, 1 min cooldown | Dense Dynamite |
| Demonic / Dark Rune | Rune | off | 1200 mana for 800 health, 2 min cooldown | — |
<!-- /gen:consumables -->

- **Spellstone / Firestone.** Each build uses one: the Major Spellstone (+2% haste, +21 Shadow spell power) or the Major
  Firestone (+2% spell crit, +21 Fire spell power). It stacks with a weapon oil.
- **Major Spellblasting Potion** is used with your other cooldowns and then whenever it is ready.
- **Explosives** (Engineering) are thrown whenever their cooldown is ready: instant, with a 1 s global cooldown of their
  own. Their damage is a roll between the two numbers. No spell power and no talents. They can miss (your hit chance) and
  crit (your *sheet* crit, × 1.5); Curse of the Elements raises them by 10%.

---

## 15. Priority lists, cooldowns and the builds

A build's priority list is read from the top every time you can act; the first action whose condition is met is cast.
The last entry is a filler that is always possible.

<!-- gen:actions -->
| Priority action | It casts when |
|---|---|
| Curse of the Elements if missing | The option "Keep Curse of the Elements up" is on, the curse is not on the boss and more than 10 s of the fight are left. |
| Shadow Bolt (max rank) if Shadow Trance (Nightfall) is up | Shadow Trance (Nightfall) is up: an instant Shadow Bolt. |
| Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) | No Bane of yours is on the boss. Bane of Doom if it is off cooldown and at least 60 s are left; otherwise Bane of Agony, near the end only while it still pays off. |
| Bane of Agony if no Bane (never Bane of Doom) | No Bane of yours is on the boss; near the end only while it still pays off. Never casts Bane of Doom. |
| Corruption if missing/expiring | Corruption is missing or would run out before a new cast lands; near the end only while it still pays off. |
| Siphon Life if missing/expiring | Siphon Life is missing or about to run out; near the end only while it still pays off. |
| Immolate if missing/expiring | Immolate is missing or would run out before a new cast lands; near the end only while it still pays off. With "Conflagrate only when Immolate is about to expire" in the list, a running Immolate is not refreshed while Conflagrate is ready. |
| Conflagrate on cooldown while Immolate is up | Conflagrate is off cooldown and Immolate is on the boss. |
| Conflagrate only when Immolate is about to expire (≤ 3 s left) | Conflagrate is off cooldown and Immolate has at most 3 s left. |
| Shadowburn on cooldown (needs a Soul Shard) | Shadowburn is off cooldown. |
| Shadowburn only to keep Shadow and Flame (Fire +10%) up (≤ 3 s left) | Shadow and Flame is talented, Shadowburn is off cooldown, and its Fire buff is missing or has at most 3 s left. |
| Conflagrate only to keep Shadow and Flame (Shadow +10%) up (≤ 3 s left) | Shadow and Flame is talented, Conflagrate is off cooldown, Immolate is on the boss, and the Shadow buff is missing or has at most 3 s left. |
| Keep Curse of the Elements and DoTs on the extra targets (multi-DoT) | With 2 or 3 targets: on each extra target, first your Curse of the Elements (if the option is on), then Corruption, Siphon Life, Bane of Agony and Immolate when missing or about to run out. No Bane of Agony on the Bane of Havoc target. Added by itself right above the filler when "Multi-DoT the extra targets" is ticked. |
| Shadow Bolt an extra target that has your DoTs but no Improved Shadow Bolt | With 2 or 3 targets and Improved Shadow Bolt: a Shadow Bolt at an extra target that carries one of your DoTs and whose own Improved Shadow Bolt is missing or runs out before the bolt lands. |
| Shadow Bolt (max rank) to keep Improved Shadow Bolt up on the boss | Improved Shadow Bolt is talented and the debuff on the boss is missing or runs out within one Shadow Bolt cast. |
| Death Coil on cooldown | Death Coil is off cooldown. |
| Death Coil as the finisher (when the filler would not land before the boss dies) | Death Coil is off cooldown, less time is left than the filler's cast (a channel: one tick) and the coil can still land. |
| At execute: sacrifice the pet, Fel Domination, summon the Imp | Once, at the first decision below 35% boss health: Demonic Sacrifice on the demon that is out, Fel Domination, then the Imp is summoned. Needs Demonic Sacrifice, Demonic Pact, Fel Domination and another demon out. |
| At execute: sacrifice the pet, Fel Domination, summon the Succubus | The same, summoning the Succubus. |
| Searing Pain in the execute phase (below the execute threshold) | The boss is below 35% health. |
| Searing Pain in the execute phase only to trigger Decimation (for Soul Fire) | Below 35% health, with Decimation and a Soul Fire action in the list: one Searing Pain when Soul Fire comes off cooldown within one Searing Pain cast, the Decimation buff would not be up by then, and the Soul Fire still fits before the end. |
| Soul Fire while Decimation buff is up | The Decimation buff is up and Soul Fire is off cooldown. |
| Life Tap to feed the pet (Demonic Energies) when it is nearly out of mana | With Demonic Energies and a demon out: the demon has less mana than two of its spells cost, and you are missing at least one full Life Tap of mana. |
| Life Tap when mana is below …% and more than … s remain | Your mana is below the first number (% of maximum) and more than the second number of seconds are left. Each build sets its own two numbers. |
| Searing Pain to (re)apply Demonic Brand when it is down | With Demonic Brand and a demon out: the brand is not on the boss or has no charges left. |
| Soul Fire on cooldown (spends a Soul Shard outside Decimation) | Soul Fire is off cooldown, with or without the Decimation buff. |
| Wrack when the shortest DoT has more than … s left | The shortest of the DoTs this list keeps up (Corruption, Immolate, Siphon Life, Bane of Agony; not Bane of Doom) has more than the build's number of seconds left. Otherwise the list goes on to the filler below. |
| Wrack (filler channel) | Always (filler). |
| Shadow Bolt (filler) | Always (filler). |
| Incinerate (filler) | Always (filler). |
| Drain Life (filler channel) | Always (filler). |
| Hellfire (filler channel, hits every target) | Always (filler), if your health covers the whole channel. |
| Rain of Fire (filler channel, hits every target) | Always (filler). |
| Searing Pain (filler) | Always (filler). |
<!-- /gen:actions -->

**DoTs at the end of the fight.** A DoT that can still run its full duration is always recast. When it cannot, the sim
adds up what the recast would still bring - the ticks that land in time, Immolate's hit, and what the DoT makes possible
(Incinerate's 25%, a Conflagrate, Nightfall procs, Soul Siphon, Wrack's bonus) - and compares it with what the next
damaging action below it in the list would do in the same time. It is recast only if it wins. With the option switched
off, the plain rule applies: recast while at least 2 ticks fit (Bane of Agony: while 12 s are left).

**When cooldowns are used** ("Pop cooldowns" on the page). This covers the racial cooldown (Blood Fury, Berserking,
Eureka!), the Major Spellblasting Potion and Power Infusion. After the first use each one is used again as soon as it is ready.

| Setting | First use |
|---|---|
| On the pull | Right before your first damaging spell. |
| When the first Bane of Doom explodes (default) | Right before the cast during which the first Bane of Doom explodes, so the explosion is covered. At the pull instead if the build never casts Bane of Doom, if a Bane of Agony went up first, or if Doom cannot explode before the fight ends. |
| In the execute phase | Once the boss is below 35% health. |
| Custom timeline | You place every use yourself, also mana potions, runes, explosives, Amplify Curse and the pet swap. What you do not place is used automatically. |

**The builds on the sheet**

<!-- gen:builds -->
### Demo Pact Shadow Bolt Succubus (2/31/18)
- Succubus out, Imp sacrificed, Major Spellstone.
- Affliction: Suppression 1/5, Improved Corruption 1/5.
- Demonology: Unholy Power 5/5, Fel Vitality 3/3, Demonic Energies 2/2, Improved Sayaad 3/3, Demonic Sacrifice 1/1, Master Summoner 2/2, Decimation 2/2, Demonic Brand 3/3, Soul Link 1/1, Demonic Knowledge 3/3, Master Demonologist 5/5, Demonic Pact 1/1.
- Destruction: Improved Shadow Bolt 5/5, Bane 5/5, Ruin 5/5, Agonizing Flames 3/3.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 3. Curse of the Elements if missing · 4. Searing Pain to (re)apply Demonic Brand when it is down · 5. Immolate if missing/expiring · 6. Corruption if missing/expiring · 7. Life Tap when mana is below 80% and more than 45 s remain · 8. Shadow Bolt (filler).

### Aff Pact Shadow Bolt Succubus (8/31/12)
- Succubus out, Imp sacrificed, Major Spellstone.
- Affliction: Improved Life Tap 2/2, Suppression 5/5, Improved Corruption 1/5.
- Demonology: Unholy Power 5/5, Fel Vitality 3/3, Demonic Energies 2/2, Improved Sayaad 3/3, Demonic Sacrifice 1/1, Master Summoner 2/2, Decimation 2/2, Demonic Brand 3/3, Soul Link 1/1, Demonic Knowledge 3/3, Master Demonologist 5/5, Demonic Pact 1/1.
- Destruction: Improved Shadow Bolt 5/5, Bane 5/5, Ruin 2/5.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 3. Curse of the Elements if missing · 4. Searing Pain to (re)apply Demonic Brand when it is down · 5. Corruption if missing/expiring · 6. Immolate if missing/expiring · 7. Life Tap when mana is below 80% and more than 45 s remain · 8. Shadow Bolt (filler).

### Demo Pact Fire Imp (2/31/18)
- Imp out, Succubus sacrificed, Major Firestone.
- Affliction: Suppression 1/5, Improved Corruption 1/5.
- Demonology: Improved Imp 3/3, Unholy Power 5/5, Fel Vitality 3/3, Demonic Energies 2/2, Demonic Sacrifice 1/1, Master Summoner 2/2, Decimation 2/2, Demonic Brand 3/3, Soul Link 1/1, Demonic Knowledge 3/3, Master Demonologist 5/5, Demonic Pact 1/1.
- Destruction: Bane 5/5, Aftermath 5/5, Ruin 5/5, Agonizing Flames 3/3.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Searing Pain to (re)apply Demonic Brand when it is down · 3. Life Tap to feed the pet (Demonic Energies) when it is nearly out of mana · 4. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 5. Curse of the Elements if missing · 6. Immolate if missing/expiring · 7. Soul Fire while Decimation buff is up · 8. Corruption if missing/expiring · 9. Life Tap when mana is below 80% and more than 45 s remain · 10. Searing Pain (filler).

### Destro Incinerate Succubus (14/4/33)
- Succubus out, nothing sacrificed, Major Firestone.
- Affliction: Improved Life Tap 2/2, Suppression 5/5, Improved Corruption 3/5, Amplify Curse 1/1, Pandemic 3/3.
- Demonology: Unholy Power 4/5.
- Destruction: Bane 5/5, Cataclysm 3/3, Aftermath 5/5, Ruin 5/5, Shadowburn 1/1, Agonizing Flames 3/3, Conflagrate 1/1, Bane of Havoc 1/1, Fire and Brimstone 3/3, Shadow and Flame 5/5, Incinerate 1/1.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 3. Curse of the Elements if missing · 4. Immolate if missing/expiring · 5. Corruption if missing/expiring · 6. Conflagrate on cooldown while Immolate is up · 7. Shadowburn on cooldown (needs a Soul Shard) · 8. Life Tap when mana is below 50% and more than 25 s remain · 9. Incinerate (filler).

### Destro Incinerate Imp (14/6/31)
- Imp out, nothing sacrificed, Major Firestone.
- Affliction: Improved Life Tap 2/2, Suppression 5/5, Improved Corruption 3/5, Amplify Curse 1/1, Pandemic 3/3.
- Demonology: Improved Imp 3/3, Unholy Power 2/5, Demonic Energies 1/2.
- Destruction: Bane 5/5, Cataclysm 3/3, Aftermath 3/5, Ruin 5/5, Shadowburn 1/1, Agonizing Flames 3/3, Conflagrate 1/1, Bane of Havoc 1/1, Fire and Brimstone 3/3, Shadow and Flame 5/5, Incinerate 1/1.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 3. Corruption if missing/expiring · 4. Immolate if missing/expiring · 5. Curse of the Elements if missing · 6. Life Tap to feed the pet (Demonic Energies) when it is nearly out of mana · 7. Conflagrate on cooldown while Immolate is up · 8. Shadowburn on cooldown (needs a Soul Shard) · 9. Life Tap when mana is below 40% and more than 60 s remain · 10. Incinerate (filler).

### SM Ruin (classic) (30/0/21)
- Succubus out, nothing sacrificed, Major Spellstone.
- Affliction: Improved Life Tap 2/2, Suppression 5/5, Improved Corruption 4/5, Improved Bane of Agony 2/2, Amplify Curse 1/1, Pandemic 3/3, Malevolence 5/5, Nightfall 2/2, Siphon Life 1/1, Shadow Mastery 5/5.
- Destruction: Improved Shadow Bolt 5/5, Bane 5/5, Cataclysm 3/3, Ruin 5/5, Agonizing Flames 3/3.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Doom if ≥60 s left and ready, else Bane of Agony if no Bane (while it still pays off) · 3. Corruption if missing/expiring · 4. Shadow Bolt (max rank) if Shadow Trance (Nightfall) is up · 5. Siphon Life if missing/expiring · 6. Curse of the Elements if missing · 7. Immolate if missing/expiring · 8. Life Tap when mana is below 40% and more than 25 s remain · 9. Shadow Bolt (filler).

### Wrack Succubus (33/0/18)
- Succubus out, nothing sacrificed, Major Spellstone.
- Affliction: Improved Life Tap 2/2, Suppression 5/5, Improved Corruption 3/5, Improved Bane of Agony 2/2, Amplify Curse 1/1, Pandemic 3/3, Malevolence 5/5, Nightfall 2/2, Siphon Life 1/1, Soul Siphon 3/3, Shadow Mastery 5/5, Wrack 1/1.
- Destruction: Improved Shadow Bolt 5/5, Bane 5/5, Ruin 5/5, Agonizing Flames 3/3.
- Priority: 1. Death Coil as the finisher (when the filler would not land before the boss dies) · 2. Bane of Agony if no Bane (never Bane of Doom) · 3. Corruption if missing/expiring · 4. Siphon Life if missing/expiring · 5. Curse of the Elements if missing · 6. Immolate if missing/expiring · 7. Shadow Bolt (max rank) to keep Improved Shadow Bolt up on the boss · 8. Shadow Bolt (max rank) if Shadow Trance (Nightfall) is up · 9. Life Tap when mana is below 60% and more than 25 s remain · 10. Wrack (filler channel).
<!-- /gen:builds -->

---

## 16. Results, and what is assumed or left out

**The numbers on the page**

- **DPS** = all damage of a fight ÷ its length, averaged over all fights. The ± next to it is the 95% margin of that
  average: 1.96 × standard deviation ÷ √fights.
- **Stat weights.** The build is simulated again with +100 spell power, +2% hit, +2% crit, +2% haste, +120 Intellect and
  +20 Spell Pierce, on exactly the same fights and rolls. The weight is the DPS gained per point. Hit, crit, haste and
  Intellect are shown as the spell power they are worth (their weight ÷ the spell power weight).
- **Before / in the execute phase** splits the damage at 35% boss health.

**Assumed, not verified in Forever yet**

- The demons' mana pool (2,000) and regeneration (8 per second).
- The Succubus' base melee damage (73.5 per second); the Felhunter's and Voidwalker's melee.
- How much damage Spell Pierce adds below 0 resistance.
- Which consumables exclude each other.
- Values taken from Classic because Forever's are not known: base stats of a level-60 Warlock, boss armor (3,731),
  Salvation (30%), Concentration Aura (35%).

**Simplified**

- Direct hits deal their average damage, and the boss's health falls in a straight line.
- Touch of the Grave is never resisted. In the game it can be partly resisted in the seconds before the curse is up.
- Spirit regeneration is added smoothly instead of in 2-second steps.
- The end-of-fight DoT check does not count mana, Touch of the Grave, Judgement of Wisdom or extra Improved Shadow Bolt time.

**Not simulated**

- Items, trinkets and set bonuses: you enter your stat totals.
- Damage the boss does to you, and dying.
- Range and positioning: the boss is always in range.
- Soul shard limits (they never run out) and potions used before the pull.
- A demon's health (so the smaller demon health in Forever changes nothing here), and demon abilities other than the
  ones in section 7.
- Seed of Corruption, Drain Mana, Health Funnel, and curses other than Curse of the Elements.
- Talents marked "not simulated" in section 6.
