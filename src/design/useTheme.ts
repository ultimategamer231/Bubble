import { useColorScheme } from 'react-native';

import { colors, type Palette } from './tokens';

/** Returns the palette for the current system light/dark setting. */
export function useTheme(): Palette {
  return colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
