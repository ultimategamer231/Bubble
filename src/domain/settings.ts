/**
 * Settings: types, defaults, ranges and validation (docs/DATA_MODEL.md, docs/PRD.md §6).
 * Pure — no storage here. SettingsRepo (Phase 3) persists these values.
 */

export type ThemeSetting = 'system' | 'light' | 'dark';

export type Settings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  /** A long break follows every N completed focus sessions. */
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  keepScreenOn: boolean;
  sound: boolean;
  vibration: boolean;
  theme: ThemeSetting;
  wallpaperColors: boolean;
  notifSheetShown: boolean;
  /** Most recent first, max 5, case-insensitive unique. */
  recentIntents: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  keepScreenOn: false,
  sound: true,
  vibration: false,
  theme: 'system',
  wallpaperColors: false,
  notifSheetShown: false,
  recentIntents: [],
};

export type NumericSettingKey = 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'longBreakEvery';

export const RANGES: Record<NumericSettingKey, { min: number; max: number }> = {
  focusMin: { min: 1, max: 180 },
  shortBreakMin: { min: 1, max: 60 },
  longBreakMin: { min: 1, max: 90 },
  longBreakEvery: { min: 2, max: 8 },
};

export const MAX_INTENT_LENGTH = 60;
export const MAX_RECENT_INTENTS = 5;

/** True when `value` is a whole number inside the range for `key`. */
export function isValidNumber(key: NumericSettingKey, value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  const { min, max } = RANGES[key];
  return value >= min && value <= max;
}

/**
 * Parses user input ("25", " 25 ", 25) for a numeric setting.
 * Returns the number, or null when it is not a whole number in range.
 */
export function parseNumberSetting(key: NumericSettingKey, input: unknown): number | null {
  let value: number;
  if (typeof input === 'number') value = input;
  else if (typeof input === 'string' && /^\s*\d+\s*$/.test(input)) value = Number(input.trim());
  else return null;
  return isValidNumber(key, value) ? value : null;
}

/** Trim, cap at 60 characters, and turn an empty intent into null. */
export function normalizeIntent(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().slice(0, MAX_INTENT_LENGTH).trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Puts `intent` first, removes case-insensitive duplicates, keeps at most 5. */
export function addRecentIntent(recent: readonly string[], intent: string | null): string[] {
  const clean = normalizeIntent(intent);
  if (clean === null) return recent.slice(0, MAX_RECENT_INTENTS);
  const key = clean.toLowerCase();
  const rest = recent.filter((r) => r.toLowerCase() !== key);
  return [clean, ...rest].slice(0, MAX_RECENT_INTENTS);
}

/** Cleans a stored recent-intents value (unknown JSON) into a valid list. */
export function sanitizeRecentIntents(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  let out: string[] = [];
  for (let i = value.length - 1; i >= 0; i--) {
    if (typeof value[i] === 'string') out = addRecentIntent(out, value[i]);
  }
  return out;
}

/**
 * Builds a complete, valid Settings object from untrusted values.
 * Any missing or invalid field falls back to its default (DATA_MODEL: "Invalid stored
 * values fall back to defaults and are rewritten").
 */
export function sanitizeSettings(raw: { [K in keyof Settings]?: unknown }): Settings {
  const num = (key: NumericSettingKey): number =>
    isValidNumber(key, raw[key]) ? (raw[key] as number) : DEFAULT_SETTINGS[key];
  const bool = (
    key: {
      [K in keyof Settings]: Settings[K] extends boolean ? K : never;
    }[keyof Settings],
  ): boolean => (typeof raw[key] === 'boolean' ? (raw[key] as boolean) : DEFAULT_SETTINGS[key]);
  const theme = raw.theme;
  return {
    focusMin: num('focusMin'),
    shortBreakMin: num('shortBreakMin'),
    longBreakMin: num('longBreakMin'),
    longBreakEvery: num('longBreakEvery'),
    autoStartBreaks: bool('autoStartBreaks'),
    autoStartFocus: bool('autoStartFocus'),
    keepScreenOn: bool('keepScreenOn'),
    sound: bool('sound'),
    vibration: bool('vibration'),
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
    wallpaperColors: bool('wallpaperColors'),
    notifSheetShown: bool('notifSheetShown'),
    recentIntents: sanitizeRecentIntents(raw.recentIntents),
  };
}
