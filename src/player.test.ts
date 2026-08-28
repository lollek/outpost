import { describe, expect, it } from 'vitest';
import { Player, HAMMER_COST, WALL_COST } from './player';
import { WALL_T, type Wall } from './los';
import type { World } from './world';

const wall: Wall = { cx: 100, cy: 100, hw: 23, hh: WALL_T / 2, a: 0 };

function emptyWorld(): World {
  const world = {
    wallsInRect: () => [],
    treesInRect: () => [],
    rocksInRect: () => [],
    addWall: () => {},
  };
  return world as unknown as World;
}

describe('hammer crafting', () => {
  it('requires enough wood to craft', () => {
    const player = new Player(300, 300);
    player.wood = HAMMER_COST - 1;

    expect(player.craftHammer()).toBe(false);
    expect(player.hasHammer).toBe(false);
    expect(player.wood).toBe(HAMMER_COST - 1);
  });

  it('crafts exactly one hammer for its wood cost', () => {
    const player = new Player(300, 300);
    player.wood = HAMMER_COST + 2;

    expect(player.craftHammer()).toBe(true);
    expect(player.hasHammer).toBe(true);
    expect(player.wood).toBe(2);
    expect(player.craftHammer()).toBe(false);
    expect(player.wood).toBe(2);
  });
});

describe('wall building', () => {
  it('does not place a wall without a hammer', () => {
    const player = new Player(300, 300);
    const world = emptyWorld();
    let wallsAdded = 0;
    world.addWall = () => { wallsAdded++; };
    player.wood = WALL_COST;

    player.buildAt(world, wall);

    expect(wallsAdded).toBe(0);
    expect(player.wood).toBe(WALL_COST);
  });

  it('places a wall and consumes its cost with a hammer', () => {
    const player = new Player(300, 300);
    const world = emptyWorld();
    let wallsAdded = 0;
    world.addWall = () => { wallsAdded++; };
    player.hasHammer = true;
    player.wood = WALL_COST;

    player.buildAt(world, wall);

    expect(wallsAdded).toBe(1);
    expect(player.wood).toBe(0);
  });
});