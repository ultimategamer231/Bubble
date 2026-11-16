import { DEFAULT_SETTINGS, type Settings } from '../../settings';
import { createInitialTimer, reduce } from '../reduce';
import type { Command, Now, SessionRecord } from '../types';
import golden from '../__fixtures__/vectors.json';

type Step = {
  cmd: Command;
  now: Now;
  settings?: Partial<Settings>;
  expect: { state?: object; effects?: string[]; recorded?: Partial<SessionRecord>[] };
};
type Vector = { name: string; settings?: Partial<Settings>; steps: Step[] };

describe('golden vectors (QA A16)', () => {
  const vectors = golden.vectors as unknown as Vector[];

  it('has vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(12);
  });

  it.each(vectors.map((v) => [v.name, v] as const))('%s', (_name, vector) => {
    const base: Settings = { ...DEFAULT_SETTINGS, ...golden.defaultSettings, ...vector.settings };
    let state = createInitialTimer('s0', base);
    vector.steps.forEach((step, i) => {
      const where = `step ${i + 1} (${step.cmd.type})`;
      const { next, effects } = reduce(state, step.cmd, step.now, { ...base, ...step.settings });
      if (step.expect.state)
        expect({ where, state: next }).toMatchObject({ where, state: step.expect.state });
      if (step.expect.effects) {
        expect({ where, effects: effects.map((e) => e.type) }).toEqual({
          where,
          effects: step.expect.effects,
        });
      }
      if (step.expect.recorded) {
        const rows = effects.flatMap((e) => (e.type === 'RecordSession' ? [e.session] : []));
        expect(rows).toHaveLength(step.expect.recorded.length);
        expect({ where, rows }).toMatchObject({ where, rows: step.expect.recorded });
      }
      state = next;
    });
  });
});
