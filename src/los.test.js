import { describe, it, expect } from 'vitest';
import { segmentsIntersect, hasLineOfSight, circleOverlapsRect, aabbWall } from './los';
describe('segmentsIntersect', () => {
    it('detects crossing segments', () => {
        expect(segmentsIntersect(0, 0, 2, 2, 0, 2, 2, 0)).toBe(true);
    });
    it('returns false for parallel horizontal segments', () => {
        expect(segmentsIntersect(0, 0, 4, 0, 0, 1, 4, 1)).toBe(false);
    });
    it('returns false for non-overlapping collinear segments', () => {
        expect(segmentsIntersect(0, 0, 1, 0, 2, 0, 3, 0)).toBe(false);
    });
    it('returns false for T-shape that misses (extension would cross)', () => {
        // Vertical segment ends just before the horizontal one starts
        expect(segmentsIntersect(1, 0, 1, 0.9, 0, 1, 2, 1)).toBe(false);
    });
    it('detects T-intersection when segments touch', () => {
        expect(segmentsIntersect(1, 0, 1, 1, 0, 1, 2, 1)).toBe(true);
    });
});
describe('hasLineOfSight', () => {
    const wall = aabbWall(5, 0, 2, 10);
    it('is blocked when wall sits between two points', () => {
        expect(hasLineOfSight(0, 5, 10, 5, [wall])).toBe(false);
    });
    it('is clear when the path goes around the wall', () => {
        expect(hasLineOfSight(0, 15, 10, 15, [wall])).toBe(true);
    });
    it('is clear with an empty wall list', () => {
        expect(hasLineOfSight(0, 0, 100, 100, [])).toBe(true);
    });
    it('is blocked by the first of several walls', () => {
        const walls = [
            aabbWall(3, 0, 2, 10),
            aabbWall(7, 0, 2, 10),
        ];
        expect(hasLineOfSight(0, 5, 15, 5, walls)).toBe(false);
    });
    it('is blocked by the second of several walls', () => {
        const walls = [
            aabbWall(3, 20, 2, 10), // not in the way
            aabbWall(7, 0, 2, 10), // blocks
        ];
        expect(hasLineOfSight(0, 5, 15, 5, walls)).toBe(false);
    });
});
describe('circleOverlapsRect', () => {
    it('detects centre of circle inside rect', () => {
        expect(circleOverlapsRect(5, 5, 3, 0, 0, 10, 10)).toBe(true);
    });
    it('detects circle edge touching rect side', () => {
        // Circle at (0,5) radius 3 — right edge at x=3, rect left edge at x=2
        expect(circleOverlapsRect(0, 5, 3, 2, 0, 8, 10)).toBe(true);
    });
    it('returns false when circle is clearly outside', () => {
        expect(circleOverlapsRect(20, 20, 3, 0, 0, 10, 10)).toBe(false);
    });
    it('returns false when circle is just outside a corner', () => {
        // Circle centred at (13, 13), radius 3. Corner of rect at (10,10).
        // Distance to corner = sqrt(18) ≈ 4.24 > 3
        expect(circleOverlapsRect(13, 13, 3, 0, 0, 10, 10)).toBe(false);
    });
    it('detects circle overlapping a corner', () => {
        // Circle centred at (12, 12), radius 4. Distance to corner (10,10) ≈ 2.83 < 4
        expect(circleOverlapsRect(12, 12, 4, 0, 0, 10, 10)).toBe(true);
    });
});
