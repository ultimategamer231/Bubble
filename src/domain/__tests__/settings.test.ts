import {
  addRecentIntent,
  DEFAULT_SETTINGS,
  isValidNumber,
  normalizeIntent,
  parseNumberSetting,
  sanitizeRecentIntents,
  sanitizeSettings,
} from '../settings';

describe('A6 duration validation', () => {
  it('accepts the edges of each range', () => {
    expect(parseNumberSetting('focusMin', 1)).toBe(1);
    expect(parseNumberSetting('focusMin', 180)).toBe(180);
    expect(parseNumberSetting('shortBreakMin', '60')).toBe(60);
    expect(parseNumberSetting('longBreakMin', ' 90 ')).toBe(90);
    expect(parseNumberSetting('longBreakEvery', 2)).toBe(2);
    expect(parseNumberSetting('longBreakEvery', 8)).toBe(8);
  });

  it.each([0, 181, Number.NaN, -5, 1.5, Infinity, '', 'abc', '12.5', '-3', null, undefined, {}])(
    'rejects %p',
    (value) => {
      expect(parseNumberSetting('focusMin', value)).toBeNull();
    },
  );

  it('rejects values outside the other ranges', () => {
    expect(parseNumberSetting('shortBreakMin', 61)).toBeNull();
    expect(parseNumberSetting('longBreakMin', 91)).toBeNull();
    expect(parseNumberSetting('longBreakEvery', 1)).toBeNull();
    expect(parseNumberSetting('longBreakEvery', 9)).toBeNull();
    expect(isValidNumber('focusMin', '25')).toBe(false);
  });
});

describe('A13 intents', () => {
  it('normalizes', () => {
    expect(normalizeIntent('  Chapter 4  ')).toBe('Chapter 4');
    expect(normalizeIntent('')).toBeNull();
    expect(normalizeIntent('   ')).toBeNull();
    expect(normalizeIntent(null)).toBeNull();
    expect(normalizeIntent(undefined)).toBeNull();
    expect(normalizeIntent('a'.repeat(61))).toHaveLength(60);
    // No trailing space left behind by the cut.
    expect(normalizeIntent(`${'a'.repeat(59)} bcd`)).toBe('a'.repeat(59));
  });

  it('recent intents: most recent first, case-insensitive dedupe, max 5', () => {
    let recent: string[] = [];
    for (const i of ['Math', 'Essay', 'Code', 'Read', 'Plan']) recent = addRecentIntent(recent, i);
    expect(recent).toEqual(['Plan', 'Read', 'Code', 'Essay', 'Math']);
    recent = addRecentIntent(recent, 'ESSAY');
    expect(recent).toEqual(['ESSAY', 'Plan', 'Read', 'Code', 'Math']);
    recent = addRecentIntent(recent, 'Email');
    expect(recent).toEqual(['Email', 'ESSAY', 'Plan', 'Read', 'Code']);
    expect(addRecentIntent(recent, '   ')).toEqual(recent);
    expect(addRecentIntent(recent, null)).toEqual(recent);
  });

  it('cleans stored recent intents', () => {
    expect(sanitizeRecentIntents('nope')).toEqual([]);
    expect(sanitizeRecentIntents(['A', 1, 'a', ' B ', '', 'C', 'D', 'E', 'F'])).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });
});

describe('B6 settings fall back to defaults', () => {
  it('keeps valid values and replaces invalid ones', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
    const s = sanitizeSettings({
      focusMin: 500,
      shortBreakMin: 10,
      longBreakMin: 'x',
      longBreakEvery: 3,
      autoStartBreaks: true,
      sound: 'yes',
      theme: 'pink',
      vibration: true,
      recentIntents: ['One', 'one', 'Two'],
    });
    expect(s).toEqual({
      ...DEFAULT_SETTINGS,
      shortBreakMin: 10,
      longBreakEvery: 3,
      autoStartBreaks: true,
      vibration: true,
      recentIntents: ['One', 'Two'],
    });
    expect(sanitizeSettings({ theme: 'dark' }).theme).toBe('dark');
    expect(sanitizeSettings({ theme: 'light' }).theme).toBe('light');
  });
});
