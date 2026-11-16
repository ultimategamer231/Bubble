/**
 * Config plugin: keeps Android lint green on the styles Expo generates.
 *
 * expo-splash-screen writes `android:windowSplashScreenBehavior` into styles.xml. That
 * attribute only exists on Android 13+ (API 33); older versions simply ignore it, but lint
 * reports it as a NewApi error because our minSdk is 26. Marking the item with
 * `tools:targetApi="33"` tells lint the use is intentional. Runtime behaviour is unchanged.
 *
 * Must be listed BEFORE expo-splash-screen in app.config.ts (later plugins' mods run first).
 */
const { withAndroidStyles } = require('expo/config-plugins');

const API_33_ITEMS = new Set(['android:windowSplashScreenBehavior']);

function markApi33Items(styles) {
  for (const style of styles.resources.style ?? []) {
    for (const item of style.item ?? []) {
      if (API_33_ITEMS.has(item.$.name)) item.$['tools:targetApi'] = '33';
    }
  }
  styles.resources.$ = {
    ...styles.resources.$,
    'xmlns:tools': 'http://schemas.android.com/tools',
  };
  return styles;
}

function withLintCleanStyles(config) {
  return withAndroidStyles(config, (cfg) => {
    cfg.modResults = markApi33Items(cfg.modResults);
    return cfg;
  });
}

module.exports = withLintCleanStyles;
module.exports.markApi33Items = markApi33Items;
