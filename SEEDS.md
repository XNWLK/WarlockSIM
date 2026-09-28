# Seeds — how randomness works in Xn's Forever Warlock Sim

Every random event in a fight (hit or miss, crit, Nightfall procs, pet attacks, …) comes from a **seeded random number
generator**. The seed decides which "dice rolls" come out, in which order. Same seed + same settings = exactly the same
fights, on any computer and in any browser.

The setting is **Fight & pets → Advanced → Random seed** (default **12345**).

---

## 1. From one seed to thousands of fights

A run simulates every build × race for *N* fights (default 1,000). Each fight gets its own seed, made from the run seed:

```
fight seed (fight i) = (run seed × 7919 + i)   — i = 0 for fight #1, 1 for fight #2, …
```

So fight #1 of every build and race always uses the same fight seed, fight #2 the next one, and so on. Changing the run
seed changes every fight.

The fight's **length** also comes from its seed: each fight lasts the set duration ± up to 10% (setting "Length variation
± %"), drawn from a separate generator made from the fight seed. Fight #1 therefore always has the same length.

The generator is *mulberry32* (`engine/rng.js`): it turns a seed into a long, fixed list of numbers between 0 and 1.

## 2. One list per kind of roll ("streams")

Inside a fight, the fight seed is split into **independent lists of numbers**, one per kind of roll:

| Stream | Used for |
|---|---|
| **hit** | whether your spells land (direct spells, DoT applications, channels, explosives) |
| **crit** | whether your hits and DoT ticks crit (explosives too) |
| **proc** | Nightfall, Touch of the Grave, Shadow and Flame's keep / refund chance, explosive damage |
| **vuln** | Spell Pierce bonus damage and partial resists |
| **pet** | everything the pet does: spell hit and crit, the melee roll (miss, dodge, glancing, crit) |
| **jow** | Judgement of Wisdom procs |
| **isb** | the hit roll of the Improved Shadow Bolt debuff after a Shadow Bolt crit |

Each roll takes **the next number** from its list and compares it with a chance:

```
crit  if  number × 100 < your crit chance for that spell
miss  if  number × 100 ≥ your hit chance
```

DoTs snapshot the crit chance when they are applied; each tick then takes its own number from the crit list.

## 3. What this means in a fight — the "3rd Shadow Bolt always crits" effect

Fight #1's crit list (seed 12345) starts like this, as % rolls:

```
55.0   55.4   16.6   47.1   3.4   91.6   55.8   6.6   …
```

The **5th crit roll** of fight #1 draws 3.4, so whatever spell makes that roll crits at any crit chance above 3.4%.
The numbers are fixed; *which spell* gets each one depends on the order of your rolls: every hit and every DoT tick uses
one (a curse or a Life Tap does not). If your opening is always the same (Bane, Curse, Immolate, Corruption, …), the same
spell lands on the same low number every time. That is why a certain Shadow Bolt in fight #1 can crit in every run.

**This is only fight #1.** The rotation log, the timeline and the DoT chart in a build's details all show fight #1, so
they look identical from run to run. Every other fight has its own list. The first six Shadow Bolts of fights #2–#6 in
Demo Pact Shadow Bolt Succubus (X = crit):

```
.X.X..    X.....    X....X    ......    X.X..X
```

The DPS in the table is the **average over all fights**, so a lucky number in fight #1 does not bias it; the tests check
that the crit rate over many fights matches the crit chance.

## 4. Changing a stat: the dice stay, the bar moves

When you raise crit, the list of numbers stays the same — only the threshold moves. So every crit that happened before
still happens, and some rolls that just missed now crit too. Fight #1 of the same build:

| Sheet crit | Which of the first 8 crit rolls crit | Shadow Bolts that crit (first 6) |
|---|---|---|
| 10% | #5 (3.4), #8 (6.6) | 6th |
| 15% | + #3 (16.6) | 6th |
| 25% | + #3 | 5th, 6th |

Hit works the same way on the hit list: more hit turns some misses into hits and never the other way round.

**One limit:** the lists are shared by *all* rolls of their kind. If a change adds or removes rolls — more haste means more
casts, a new DoT adds ticks, a talent adds a spell — then every later roll of that kind shifts along the list and lands on
a different spell. The fight is then still "the same luck" in total, but not roll for roll. Keeping the streams separate
limits this: an extra crit roll never moves your hit, proc or pet rolls (that is why Judgement of Wisdom and the ISB debuff
got their own lists — adding them changed nothing else).

## 5. Why it is built this way: common random numbers

Comparisons need the same luck on both sides. If build A were simulated with other dice than build B, a difference of
0.3% would drown in the noise of the dice. With the same fight seeds:

- **Builds and races** in one run are all simulated on the same fights.
- **Stat weights**: the normal run and the +100 SP / +2% hit / +2% crit / +2% haste / +120 Int / +20 Pierce runs use the
  same seed, so the difference is (almost) only the stat.
- **Quick sim** in the build editor runs your build next to the sheet's best build on the same fights.
- **Batch compare** and the talent searches (hill-climbs) use the same seeds too.

This technique is called *common random numbers*. It is why small differences (±0.1–0.5%) can be measured at all.

## 6. Practical notes

- **Want to see a different sample fight?** Change the seed. Fight #1, its rotation log and timeline all change; the
  averages only move within the ± shown under each DPS (the 95% range of the average).
- **Want more certainty?** Raise "Fights per combo". The ± shrinks with the square root of the number of fights
  (4× the fights ≈ half the ±).
- **Two runs disagree by a few tenths?** Check that seed, fights per combo and length variation are the same.
- **Sharing a result:** the settings code (Presets, share settings & batch compare) includes the seed, so someone else
  can reproduce your exact numbers.
- Hit and crit are rolled separately (first the hit list, then the crit list); a miss never uses a crit number.
