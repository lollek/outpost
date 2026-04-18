# Outpost — Game Design Document
*Working title. Browser-based survival game.*

---

## Concept

Outpost is a top-down single-player survival game inspired by Rust. The player spawns in a procedurally generated world with nothing, gathers resources, builds a base, and defends it against escalating NPC factions. The game runs in repeatable cycles with a fixed end point — every run starts from zero.

---

## Platform & Stack

- Browser-based (HTML5 Canvas, vanilla JavaScript)
- Offline only, single-player
- No external dependencies

---

## Perspective

The game is top-down. Roofs are rendered on all buildings by default. When the player enters a building, only that building's roof is removed — other structures remain opaque. This means the interior of enemy camps and structures is hidden until the player steps inside, which preserves the tension of entering unknown space.

---

## Core Loop

**Morning → Midday:** Resource gathering, base building, expansion. Enemies are active but cautious — they prioritize escape over combat when carrying loot.

**Evening:** Enemy scouts become active. The player should patrol, spot, and kill scouts before they can report the base location. Threat level rises with each successful scout report.

**Night:** Raids occur. The player can:
- **Duck down** (fast-forward to morning) — passive, but raid risk is proportional to how many scouts succeeded in the evening. Risk of waking up mid-raid.
- **Stay up and fight** — dangerous, but rewards include enemy weapons and loot from raid parties.

---

## Enemy Behavior

- **Daytime:** Enemies mostly flee when encountered, since they carry loot. Wounded enemies stop fleeing. Low-tier enemies are bolder (less to lose).
- **Evening:** Scout units appear. They behave differently from regular enemies — distinct movement pattern, visible tell. If a scout escapes, it raises the night raid probability.
- **Night:** Raid parties assault the player's base. Raid size and strength scales with threat level accumulated during the evening.
- **Faction expansion:** Nearby enemy factions grow if left alone. Actively suppressing them keeps the local threat manageable. Ignoring them leads to larger, better-equipped raids.

---

## Base Building

Building is grid-based. Structures are placed tile by tile — walls, doors, and eventually floors, furniture, and crafting stations.

**Structural integrity:** Every buildable part has HP. Doors are the designated weak point and fall faster than walls. At high threat levels, raid parties will attack walls directly if the entrance is too costly to breach — forcing the player to think beyond just fortifying the door.

**Repair:**
- Hold a key while adjacent to a damaged tile to repair it. Repair is never automatic.
- During a raid, repair is disabled entirely — fight first, patch after.
- After a raid ends, repairs cost resources.
- During daytime, repairs are free and instant. Morning becomes a natural perimeter-check ritual.

---

## Day/Night Design

Nights are **shorter than Rust** and never pitch black. The darkness is uncomfortable but workable — torches and fires help. Night is mechanically distinct, not just visually harder.

The fast-forward sleep mechanic creates a genuine decision each cycle: rest safely and lose agency, or stay up and contest the night for loot and control.

---

## Threat Level System

A visible threat meter tracks nearby enemy activity. It rises when:
- Scouts successfully escape
- Enemy factions expand unchecked

It falls when:
- Scouts are killed
- Enemy camps are raided or suppressed

Threat level directly determines raid intensity at night. This makes the scout-killing loop legible and gives players a concrete number to manage.

---

## Progression & Tech Tiers

Technology advances via workbenches. Higher workbench levels unlock better tools, weapons, and building materials.

The wipe cycle length is naturally tied to the tech tree ceiling:
- Early development: low workbench cap → short runs (a few hours)
- As the game expands: higher caps → longer runs (up to a day of casual play)

This lets balance emerge from development rather than requiring upfront tuning.

---

## Atmosphere

The target feeling inside the player's base is **quiet relief** — the hostile world receding, a moment to breathe.

This is achieved through contrast, not decoration:

- **Sound boundary** — ambient world sounds (wind, distant enemies, wildlife) muffle when the player steps inside. The outside needs to feel present and slightly threatening so that the inside feels like escape.
- **Lighting contrast** — warm interior light from fires and torches against a darker outside. The player's own light sources make the space feel owned.
- **No UI pressure** — the threat meter remains visible but passive. No flashing, no countdowns. Just stillness.
- **Perceptible threshold** — entering the base triggers a subtle cue (sound shift, lighting transition) so crossing inside feels like crossing into safety, not just a rendering change.

Atmosphere is built from contrast and sound. Visual complexity and decoration are not required to achieve it.

---

## World & Replayability

- **Procedural map generation** — fresh geography each run
- **Randomized faction placement** — sometimes a strong faction spawns nearby, sometimes you get breathing room
- **Fixed wipe cycle** — every run has a defined arc and endpoint, preventing burnout
- **Low-tech enemies always present near spawn** — no run starts without immediate, manageable threat

---

## Vertical Slice (Build Priority)

Before padding with features, get the smallest thing that *feels* like the game:

1. **Movement + line-of-sight + one enemy type**
   The heartbeat of the game. If hiding from a single enemy feels tense, the foundation works.

2. **One resource + one craftable item**
   Chop a tree → get wood → build a wall. Makes the world interactive and gives LOS purpose.

3. **Day/night cycle + one raid**
   A single night where enemies come for you. No scout system yet — just survive until morning.

Everything else waits until these three feel right.

---

## Open Questions

- Meta-progression across runs? (Permanent unlocks vs. pure fresh start)
- Exact wipe cycle length once higher tech tiers are implemented
- Enemy camp visual design — fires visible at night, sense of a living world outside the player's base
