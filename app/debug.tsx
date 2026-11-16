import { Redirect } from 'expo-router';

/**
 * Hidden debug route. The screen's code is only pulled into the bundle when the build is a
 * development build, or CI sets EXPO_PUBLIC_DEBUG_SCREEN=1 (phase test APKs). Release
 * builds set it to 0, so the bundler drops the `require` below and the screen is absent.
 */
export default function DebugRoute() {
  if (__DEV__ || process.env.EXPO_PUBLIC_DEBUG_SCREEN === '1') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional so release builds drop it
    const { DebugScreen } = require('@/debug/DebugScreen') as typeof import('@/debug/DebugScreen');
    return <DebugScreen />;
  }
  return <Redirect href="/" />;
}
