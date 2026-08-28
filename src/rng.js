// Deterministic PRNG utilities.
//
// mulberry32 is a small, fast, well-distributed 32-bit generator. Seeding each
// chunk from the world seed + its coordinates means every chunk generates
// identically regardless of the order chunks are visited — a prerequisite for
// the streaming, biome-driven world this is built toward.
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// Mix a world seed with two integer coordinates into a fresh 32-bit seed.
export function hashCoords(seed, x, y) {
    let h = seed >>> 0;
    h = Math.imul(h ^ (x >>> 0), 0x27d4eb2d);
    h = Math.imul(h ^ (y >>> 0), 0x165667b1);
    h ^= h >>> 15;
    return h >>> 0;
}
export function randRange(rng, min, max) {
    return min + rng() * (max - min);
}
// Inclusive integer in [min, max].
export function randInt(rng, min, max) {
    return Math.floor(randRange(rng, min, max + 1));
}
export function chance(rng, p) {
    return rng() < p;
}
export function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}
