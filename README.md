# Outpost

A browser-based top-down survival game, inspired by Rust. You spawn with nothing, gather resources, build a base, and defend it against escalating enemy raids. Every run starts from zero.

Early in development. See [doc/game-design-document.md](doc/game-design-document.md) for the full design vision.

## What's here now

The current build covers the foundation of the game loop:

- Top-down movement with wall collision
- An enemy that patrols a waypoint path with a visible cone of vision
- Line-of-sight detection — duck behind walls to break it
- Chase and give-up states based on whether the enemy can see you

## Getting started

**Prerequisites:** Node.js 18+

```sh
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser. Use WASD or arrow keys to move.

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
  game.ts       # entry point — game loop, input, entities
  player.ts     # player movement and collision
  enemy.ts      # enemy patrol, LOS detection, chase state
  world.ts      # wall layout and rendering
  los.ts        # line-of-sight geometry (segment intersection, circle-rect)
  los.test.ts   # unit tests for los.ts
doc/
  game-design-document.md
```
