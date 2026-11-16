/**
 * Bubble rendering data (docs/PRD.md §8, docs/DATA_MODEL.md). Pure functions.
 * A bubble is a completed focus session; nothing here reads or writes storage.
 */
import { hash32, mulberry32 } from '../hash';

export const BUBBLE_COLOR_COUNT = 6;
export const MAX_VISIBLE_BUBBLES = 12;
/** Two bubbles may overlap by at most this share of the smaller one's diameter. */
export const MAX_OVERLAP_RATIO = 0.15;

/** Diameter in dp: clamp(28 + minutes × 0.8, 32, 72). 25 min ≈ 48dp. */
export function bubbleDiameter(minutes: number): number {
  const m = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  return Math.min(72, Math.max(32, 28 + m * 0.8));
}

/** Palette index 0–5, stable for a session ID. Stored on the row at completion. */
export function bubbleColorIndex(sessionId: string): number {
  return hash32(sessionId) % BUBBLE_COLOR_COUNT;
}

/** Splits a day's bubbles into the ones drawn (first 12, oldest first) and the "+N" rest. */
export function visibleBubbles<T>(sessions: readonly T[]): { shown: T[]; overflow: number } {
  return {
    shown: sessions.slice(0, MAX_VISIBLE_BUBBLES),
    overflow: Math.max(0, sessions.length - MAX_VISIBLE_BUBBLES),
  };
}

export type BubbleInput = { id: string; minutes: number };
export type PlacedBubble = {
  id: string;
  /** Centre, in dp from the top-left of the jar's inner rectangle. */
  x: number;
  y: number;
  diameter: number;
};

const CANDIDATES_PER_BUBBLE = 48;
const MIN_SCALE = 0.4;

/**
 * Places up to 12 bubbles inside a `width` × `height` rectangle, packed from the bottom up.
 *
 * Deterministic: the same date key, sessions and size always give the same picture.
 * Each bubble tries a fixed number of seeded horizontal positions, "drops" straight down
 * at each one until it rests on the floor or on another bubble, and keeps the lowest
 * resting place. If the pile would poke out of the top, everything shrinks a little and
 * the whole layout is redone.
 */
export function layoutBubbles(
  dateKey: string,
  sessions: readonly BubbleInput[],
  width: number,
  height: number,
): PlacedBubble[] {
  const { shown } = visibleBubbles(sessions);
  for (let scale = 1; ; scale = Math.round((scale - 0.1) * 10) / 10) {
    const placed = tryLayout(dateKey, shown, width, height, scale);
    if (placed !== null || scale <= MIN_SCALE) {
      return placed ?? tryLayout(dateKey, shown, width, height, scale, true)!;
    }
  }
}

function tryLayout(
  dateKey: string,
  sessions: readonly BubbleInput[],
  width: number,
  height: number,
  scale: number,
  allowOverflow = false,
): PlacedBubble[] | null {
  const random = mulberry32(hash32(dateKey));
  const placed: PlacedBubble[] = [];
  for (const s of sessions) {
    const diameter = Math.min(bubbleDiameter(s.minutes) * scale, width, height);
    const r = diameter / 2;
    let best: { x: number; y: number } | null = null;
    for (let i = 0; i < CANDIDATES_PER_BUBBLE; i++) {
      const x = r + random() * Math.max(0, width - diameter);
      let y = height - r; // resting on the floor
      for (const p of placed) {
        const pr = p.diameter / 2;
        // Centres may be this close: touching, minus the allowed overlap (kept a hair under the limit).
        const minDist = r + pr - Math.min(diameter, p.diameter) * (MAX_OVERLAP_RATIO * 0.9);
        const dx = Math.abs(x - p.x);
        if (dx < minDist) y = Math.min(y, p.y - Math.sqrt(minDist * minDist - dx * dx));
      }
      if (best === null || y > best.y) best = { x, y };
    }
    const spot = best!;
    if (spot.y - r < 0 && !allowOverflow) return null;
    placed.push({
      id: s.id,
      x: round2(spot.x),
      y: round2(Math.max(r, spot.y)),
      diameter: round2(diameter),
    });
  }
  return placed;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
