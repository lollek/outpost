# Outpost

A browser-based top-down survival game, inspired by Rust. You spawn with nothing, gather resources, build a base, and defend it against escalating enemy raids. Every run starts from zero.

Early in development. See [doc/game-design-document.md](doc/game-design-document.md) for the full design vision.

## What's here now

- Top-down movement with collision against walls, trees, and rocks
- A seeded procedural world — 8000×6000 px (10×10 screens), divided into 400 px chunks
- Scattered trees (choppable for wood), rock clusters, and POI structures (ruins and camp shells) generated per-chunk from the world seed
- A spawn clearing kept free so you never wake up inside an obstacle
- Camera that scrolls and clamps to world bounds
- An enemy that patrols a waypoint path with a visible cone of vision
- Line-of-sight detection blocked by walls, trees, and rocks — duck behind cover to break it
- Chase and give-up states based on whether the enemy can see you
- Grid-snapped wall building (costs 3 wood)

## Getting started

**Prerequisites:** Node.js 18+

```sh
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser. Use WASD or arrow keys to move. Click a tree to chop it. Press **B** to enter build mode, **R** to rotate the wall preview, click to place.

Change `SEED` in `src/game.ts` for a different map.

## Other commands

```sh
npm test          # run tests in watch mode
npm run test:run  # single test run
npm run check     # type-check without building
npm run build     # type-check + production bundle
```

## Stack

- **TypeScript** — strict mode, no `any`
- **Vite** — dev server and bundler
- **Vitest** — unit tests for pure game logic (geometry, LOS, state machines)
- No runtime dependencies — the game is vanilla Canvas + JS

## Project structure

```
src/
  game.ts         # entry point — game loop, input, camera, entities
  player.ts       # player movement, collision, chopping, building
  enemy.ts        # enemy patrol, LOS detection, chase state
  world.ts        # chunked World — spatial queries, rendering, biome dispatch
  worldgen.ts     # per-chunk procedural generation (trees, rocks, structures)
  rng.ts          # deterministic PRNG (mulberry32 + coordinate hashing)
  los.ts          # line-of-sight geometry (segment intersection, circle-rect)
  los.test.ts     # unit tests for los.ts
  pathfinding.ts  # windowed A* (local grid around query, not whole map)
  tree.ts         # Tree type, draw, segment-blocking
  rock.ts         # Rock type, draw, segment-blocking
doc/
  game-design-document.md
```
