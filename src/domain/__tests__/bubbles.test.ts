import {
  bubbleColorIndex,
  bubbleDiameter,
  layoutBubbles,
  MAX_OVERLAP_RATIO,
  visibleBubbles,
  type BubbleInput,
  type PlacedBubble,
} from '../bubbles';
import { hash32, mulberry32 } from '../hash';

const W = 240;
const H = 260;

const sessions = (count: number, minutes: (i: number) => number = () => 25): BubbleInput[] =>
  Array.from({ length: count }, (_, i) => ({ id: `session-${i}`, minutes: minutes(i) }));

/** Largest overlap between any two bubbles, as a share of the smaller diameter. */
function worstOverlap(placed: PlacedBubble[]): number {
  let worst = 0;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const overlap = (a.diameter + b.diameter) / 2 - dist;
      worst = Math.max(worst, overlap / Math.min(a.diameter, b.diameter));
    }
  }
  return worst;
}

describe('A15 bubbles', () => {
  it('size grows with length and is clamped to 32–72dp', () => {
    expect(bubbleDiameter(1)).toBe(32);
    expect(bubbleDiameter(5)).toBe(32);
    expect(bubbleDiameter(25)).toBe(48);
    expect(bubbleDiameter(50)).toBe(68);
    expect(bubbleDiameter(55)).toBe(72);
    expect(bubbleDiameter(180)).toBe(72);
    expect(bubbleDiameter(Number.NaN)).toBe(32);
    expect(bubbleDiameter(-10)).toBe(32);
    expect(bubbleDiameter(40)).toBeGreaterThan(bubbleDiameter(25));
  });

  it('colour is stable for an ID and uses all six palette slots', () => {
    const id = '3f2c8a52-6f0e-4d7b-9a51-0c9d2f6b7e11';
    expect(bubbleColorIndex(id)).toBe(bubbleColorIndex(id));
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const c = bubbleColorIndex(`id-${i}`);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(6);
      seen.add(c);
    }
    expect(seen.size).toBe(6);
  });

  it('hash and PRNG are fixed forever (stored colours depend on them)', () => {
    expect(hash32('')).toBe(0x811c9dc5);
    expect(hash32('a')).toBe(0xe40c292c);
    expect(hash32('foobar')).toBe(0xbf9cf968);
    const r = mulberry32(42);
    const first = [r(), r(), r()];
    const again = mulberry32(42);
    expect([again(), again(), again()]).toEqual(first);
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('layout is deterministic (snapshot) and depends on the day', () => {
    const input = sessions(5, (i) => [25, 50, 10, 25, 90][i]);
    const a = layoutBubbles('2026-11-16', input, W, H);
    expect(layoutBubbles('2026-11-16', input, W, H)).toEqual(a);
    expect(layoutBubbles('2026-11-17', input, W, H)).not.toEqual(a);
    expect(a).toMatchSnapshot();
  });

  it.each([1, 2, 5, 8, 12])(
    '%i bubbles stay inside the jar without overlapping too much',
    (count) => {
      for (const day of ['2026-11-16', '2026-01-01', '2027-06-30']) {
        const placed = layoutBubbles(
          day,
          sessions(count, (i) => 5 + i * 13),
          W,
          H,
        );
        expect(placed).toHaveLength(count);
        expect(worstOverlap(placed)).toBeLessThanOrEqual(MAX_OVERLAP_RATIO + 1e-6);
        for (const b of placed) {
          const r = b.diameter / 2;
          expect(b.x - r).toBeGreaterThanOrEqual(-0.01);
          expect(b.x + r).toBeLessThanOrEqual(W + 0.01);
          expect(b.y - r).toBeGreaterThanOrEqual(-0.01);
          expect(b.y + r).toBeLessThanOrEqual(H + 0.01);
        }
      }
    },
  );

  it('packs from the bottom up', () => {
    const placed = layoutBubbles('2026-11-16', sessions(3), W, H);
    expect(placed[0].y).toBeCloseTo(H - placed[0].diameter / 2, 1);
  });

  it('twelve of the largest bubbles shrink to fit a small jar', () => {
    const placed = layoutBubbles(
      '2026-11-16',
      sessions(12, () => 180),
      160,
      170,
    );
    expect(placed).toHaveLength(12);
    expect(placed[0].diameter).toBeLessThan(72);
    expect(worstOverlap(placed)).toBeLessThanOrEqual(MAX_OVERLAP_RATIO + 1e-6);
    for (const b of placed) expect(b.y - b.diameter / 2).toBeGreaterThanOrEqual(-0.01);
  });

  it('still returns a layout when the jar is absurdly small', () => {
    const placed = layoutBubbles(
      '2026-11-16',
      sessions(12, () => 180),
      40,
      40,
    );
    expect(placed).toHaveLength(12);
  });

  it('more than 12 bubbles shows 12 plus "+N"', () => {
    expect(visibleBubbles(sessions(12))).toMatchObject({ overflow: 0 });
    const { shown, overflow } = visibleBubbles(sessions(17));
    expect(shown).toHaveLength(12);
    expect(shown[0].id).toBe('session-0');
    expect(overflow).toBe(5);
    expect(layoutBubbles('2026-11-16', sessions(17), W, H)).toHaveLength(12);
    expect(layoutBubbles('2026-11-16', [], W, H)).toEqual([]);
  });
});
