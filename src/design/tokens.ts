/**
 * Design tokens — the single source of colour, type, spacing and shape values.
 * Values come from docs/BRAND.md. No hex value may appear anywhere else in app code.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  bg: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  /** Timer fill gradient, top → bottom. */
  liquidFocus: readonly [string, string];
  coral: string;
  coralContainer: string;
  /** Break fill gradient, top → bottom. */
  liquidBreak: readonly [string, string];
  danger: string;
};

export const lightColors: Palette = {
  bg: '#F4FAF9',
  surface: '#FFFFFF',
  surfaceVariant: '#E4F1EF',
  outline: '#C3D3D2',
  text: '#1B2B2E',
  textMuted: '#5A6E70',
  primary: '#0B7A77',
  onPrimary: '#FFFFFF',
  primaryContainer: '#BFECE7',
  onPrimaryContainer: '#00302E',
  liquidFocus: ['#7FD8D1', '#34B3AC'],
  coral: '#C2493A',
  coralContainer: '#FFDAD4',
  liquidBreak: ['#FFC2B8', '#FF8E7E'],
  danger: '#B3261E',
};

export const darkColors: Palette = {
  bg: '#0C1719',
  surface: '#142427',
  surfaceVariant: '#1D3236',
  outline: '#2F4A4E',
  text: '#E3EEEE',
  textMuted: '#9AB0B1',
  primary: '#5FD4CC',
  onPrimary: '#003734',
  primaryContainer: '#0B4F4C',
  onPrimaryContainer: '#BFECE7',
  liquidFocus: ['#0E4F4C', '#17736E'],
  coral: '#FF8E7E',
  coralContainer: '#5C2A23',
  liquidBreak: ['#5C2A23', '#8A3B30'],
  danger: '#F2B8B5',
};

export const colors: Record<ColorScheme, Palette> = { light: lightColors, dark: darkColors };

/** Jar bubble palette (decorative). Index = sessions.bubble_color (0–5). */
export const bubblePaletteLight = [
  '#7FD8D1',
  '#9CC8F5',
  '#B9A6F2',
  '#FFB4A6',
  '#F7D07A',
  '#9BE0A8',
] as const;

/** Font families. Nunito is embedded natively by the expo-font config plugin. */
export const fonts = {
  displaySemiBold: 'Nunito_600SemiBold',
  displayBold: 'Nunito_700Bold',
} as const;

/** Type scale in sp (BRAND.md → Typography). */
export const type = {
  timer: 64,
  timerSmall: 48,
  title: 22,
  section: 16,
  body: 16,
  label: 14,
  caption: 12,
  /** The timer digits stop growing past this system font scale so they stay on screen. */
  timerMaxFontScale: 1.3,
} as const;

/** 4dp grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { chip: 12, card: 20, pill: 999 } as const;

/** Minimum touch target in dp. */
export const minTouch = 48;
