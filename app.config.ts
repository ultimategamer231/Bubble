import type { ExpoConfig } from 'expo/config';

// Hex values here mirror docs/BRAND.md. This file is evaluated by the Expo CLI
// outside the app bundle, so it keeps its own copies instead of importing tokens.
const BRAND_BG_LIGHT = '#F4FAF9';
const BRAND_BG_DARK = '#0C1719';
const ICON_BG = '#DDF4F1';

const config: ExpoConfig = {
  name: 'Focus Bubble',
  slug: 'focus-bubble',
  scheme: 'focusbubble',
  version: '1.0.0',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  icon: './assets/images/icon.png',
  backgroundColor: BRAND_BG_LIGHT,
  android: {
    package: 'com.corexlr.focusbubble',
    versionCode: 1,
    // Nothing leaves the phone: no cloud/device-transfer backup of the local database (T-13).
    allowBackup: false,
    adaptiveIcon: {
      backgroundColor: ICON_BG,
      foregroundImage: './assets/images/adaptive-foreground.png',
      monochromeImage: './assets/images/adaptive-monochrome.png',
    },
    // Only the permissions in docs/ARCHITECTURE.md §8 may ship. The native module's
    // config plugin adds its own in Phase 2; everything Expo adds by default is blocked.
    permissions: [],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-font',
      { fonts: ['./assets/fonts/Nunito_600SemiBold.ttf', './assets/fonts/Nunito_700Bold.ttf'] },
    ],
    './plugins/withLintCleanStyles', // must come before expo-splash-screen
    [
      'expo-splash-screen',
      {
        backgroundColor: BRAND_BG_LIGHT,
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: BRAND_BG_DARK, image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-status-bar',
    // PRD §4: minimum Android 8.0. React Native's own default is lower (24), so pin it (T-12).
    ['expo-build-properties', { android: { minSdkVersion: 26 } }],
    './plugins/withReleaseNoInternet',
    './plugins/withStandaloneDebug',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
