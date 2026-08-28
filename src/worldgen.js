import { mulberry32, hashCoords, randRange, randInt, chance, pick } from './rng';
import { TREE_MAX_HP } from './tree';
import { aabbWall, wallBounds, WALL_T } from './los';
const FOREST = {
    id: 'forest',
    ground: '#2e4a1e',
    treesPerChunk: [5, 11],
    rockClusterChance: 0.55,
    structureChance: 0.12,
};
// The one seam future biomes plug into: select a biome from chunk coords (via
// low-frequency noise so biomes form contiguous regions). Single biome for now,
// but every generator below reads its parameters from the returned biome, so
// adding biomes won't touch the generation logic itself.
export function biomeAt(_cx, _cy, _seed) {
    return FOREST;
}
const TREE_SPACING = 46; // min centre-to-centre distance between trees
export function generateChunk(seed, cx, cy, chunk) {
    const biome = biomeAt(cx, cy, seed);
    const rng = mulberry32(hashCoords(seed, cx, cy));
    const ox = cx * chunk;
    const oy = cy * chunk;
    const trees = [];
    const rocks = [];
    const walls = [];
    // POI structure — rare, roughly centred in the chunk.
    if (chance(rng, biome.structureChance)) {
        placeStructure(rng, ox, oy, chunk, walls);
    }
    // Rock clusters — tight groups that read as natural cover.
    if (chance(rng, biome.rockClusterChance)) {
        const clusters = randInt(rng, 1, 2);
        for (let i = 0; i < clusters; i++) {
            const ccx = randRange(rng, ox + 50, ox + chunk - 50);
            const ccy = randRange(rng, oy + 50, oy + chunk - 50);
            const count = randInt(rng, 3, 6);
            for (let j = 0; j < count; j++) {
                const r = randRange(rng, 9, 16);
                const x = ccx + randRange(rng, -34, 34);
                const y = ccy + randRange(rng, -34, 34);
                if (blockedByWall(x, y, r + 4, walls))
                    continue;
                rocks.push({ x, y, r });
            }
        }
    }
    // Scattered trees with a minimum spacing (rejection sampling).
    const targetTrees = randInt(rng, biome.treesPerChunk[0], biome.treesPerChunk[1]);
    let tries = 0;
    while (trees.length < targetTrees && tries < targetTrees * 8) {
        tries++;
        const x = randRange(rng, ox + 24, ox + chunk - 24);
        const y = randRange(rng, oy + 24, oy + chunk - 24);
        if (tooClose(x, y, trees, TREE_SPACING))
            continue;
        if (nearRock(x, y, rocks))
            continue;
        if (blockedByWall(x, y, 16, walls))
            continue;
        trees.push({ x, y, hp: TREE_MAX_HP });
    }
    return { trees, rocks, walls };
}
function tooClose(x, y, trees, min) {
    for (const t of trees)
        if (Math.hypot(t.x - x, t.y - y) < min)
            return true;
    return false;
}
function nearRock(x, y, rocks) {
    for (const r of rocks)
        if (Math.hypot(r.x - x, r.y - y) < r.r + 18)
            return true;
    return false;
}
function blockedByWall(x, y, pad, walls) {
    for (const w of walls) {
        const b = wallBounds(w);
        if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) {
            return true;
        }
    }
    return false;
}
// ── Structures (points of interest) ──────────────────────────────────────────
function placeStructure(rng, ox, oy, chunk, walls) {
    const type = pick(rng, ['ruin', 'camp']);
    const w = randInt(rng, 130, 210);
    const h = randInt(rng, 110, 180);
    const x = ox + (chunk - w) / 2 + randRange(rng, -26, 26);
    const y = oy + (chunk - h) / 2 + randRange(rng, -26, 26);
    if (type === 'camp')
        addCamp(rng, x, y, w, h, walls);
    else
        addRuin(rng, x, y, w, h, walls);
}
// Camp shell: a full perimeter with a single doorway gap on one random side.
function addCamp(rng, x, y, w, h, walls) {
    const t = WALL_T;
    const gapSide = randInt(rng, 0, 3); // 0 top, 1 bottom, 2 left, 3 right
    const gap = 46;
    addSideH(rng, walls, x, y, w, t, gapSide === 0 ? gap : 0);
    addSideH(rng, walls, x, y + h - t, w, t, gapSide === 1 ? gap : 0);
    addSideV(rng, walls, x, y + t, t, h - 2 * t, gapSide === 2 ? gap : 0);
    addSideV(rng, walls, x + w - t, y + t, t, h - 2 * t, gapSide === 3 ? gap : 0);
}
function addSideH(rng, walls, x, y, w, t, gap) {
    if (gap <= 0) {
        walls.push(aabbWall(x, y, w, t));
        return;
    }
    const gx = x + randRange(rng, w * 0.3, w * 0.7) - gap / 2;
    const leftW = gx - x;
    if (leftW > t)
        walls.push(aabbWall(x, y, leftW, t));
    const rightStart = gx + gap;
    const rightW = x + w - rightStart;
    if (rightW > t)
        walls.push(aabbWall(rightStart, y, rightW, t));
}
function addSideV(rng, walls, x, y, t, h, gap) {
    if (gap <= 0) {
        walls.push(aabbWall(x, y, t, h));
        return;
    }
    const gy = y + randRange(rng, h * 0.3, h * 0.7) - gap / 2;
    const topH = gy - y;
    if (topH > t)
        walls.push(aabbWall(x, y, t, topH));
    const botStart = gy + gap;
    const botH = y + h - botStart;
    if (botH > t)
        walls.push(aabbWall(x, botStart, t, botH));
}
// Ruin: a broken perimeter — each side emits 0..2 partial segments.
function addRuin(rng, x, y, w, h, walls) {
    const t = WALL_T;
    ruinSide(rng, walls, x, y, w, true, t); // top
    ruinSide(rng, walls, x, y + h - t, w, true, t); // bottom
    ruinSide(rng, walls, x, y, h, false, t); // left
    ruinSide(rng, walls, x + w - t, y, h, false, t); // right
}
function ruinSide(rng, walls, x, y, len, horizontal, t) {
    const segs = randInt(rng, 0, 2);
    for (let i = 0; i < segs; i++) {
        const segLen = randRange(rng, len * 0.2, len * 0.5);
        const start = randRange(rng, 0, len - segLen);
        if (horizontal)
            walls.push(aabbWall(x + start, y, segLen, t));
        else
            walls.push(aabbWall(x, y + start, t, segLen));
    }
}
