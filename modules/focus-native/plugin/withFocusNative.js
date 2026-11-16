/**
 * Config plugin for the focus-native module. Runs during `expo prebuild` and edits the
 * generated AndroidManifest.xml so that everything the module needs is declared:
 *
 * - the permissions from docs/ARCHITECTURE.md §8 (and nothing else),
 * - three broadcast receivers (alarm, notification/widget buttons, boot),
 * - the headless service that runs JavaScript in the background.
 *
 * Only the boot receiver is exported (Android itself must be able to call it). The alarm
 * and command receivers are reachable only through the app's own PendingIntents.
 */
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const PKG = 'com.corexlr.focusbubble.focusnative';

const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
];

const RECEIVERS = [
  { $: { 'android:name': `${PKG}.AlarmReceiver`, 'android:exported': 'false' } },
  { $: { 'android:name': `${PKG}.CommandReceiver`, 'android:exported': 'false' } },
  {
    $: { 'android:name': `${PKG}.BootReceiver`, 'android:exported': 'true' },
    'intent-filter': [
      { action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }] },
    ],
  },
];

const SERVICES = [
  { $: { 'android:name': `${PKG}.FocusHeadlessService`, 'android:exported': 'false' } },
];

/** Adds `items` to `list`, replacing any entry with the same android:name. */
function upsert(list, items) {
  const names = new Set(items.map((i) => i.$['android:name']));
  return [...(list ?? []).filter((i) => !names.has(i.$['android:name'])), ...items];
}

function applyToManifest(manifest) {
  const root = manifest.manifest;
  root['uses-permission'] = upsert(
    root['uses-permission'],
    PERMISSIONS.map((name) => ({ $: { 'android:name': name } })),
  );
  const app = root.application[0];
  app.receiver = upsert(app.receiver, RECEIVERS);
  app.service = upsert(app.service, SERVICES);
  return manifest;
}

function withFocusNative(config) {
  return withAndroidManifest(config, (cfg) => {
    // Fails early with a clear message if the manifest has no <application>.
    AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    cfg.modResults = applyToManifest(cfg.modResults);
    return cfg;
  });
}

module.exports = withFocusNative;
module.exports.applyToManifest = applyToManifest;
module.exports.PERMISSIONS = PERMISSIONS;
