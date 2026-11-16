const { RELEASE_MANIFEST } = require('../plugins/withReleaseNoInternet');

describe('withReleaseNoInternet', () => {
  it('removes INTERNET with tools:node="remove"', () => {
    expect(RELEASE_MANIFEST).toContain(
      '<uses-permission android:name="android.permission.INTERNET" tools:node="remove" />',
    );
    expect(RELEASE_MANIFEST).toContain('xmlns:tools="http://schemas.android.com/tools"');
  });
});

describe('withLintCleanStyles', () => {
  it('marks the API 33 splash attribute so lint accepts it on minSdk 26', () => {
    const { markApi33Items } = require('../plugins/withLintCleanStyles');
    const styles = {
      resources: {
        style: [
          {
            $: { name: 'Theme.App.SplashScreen' },
            item: [
              { $: { name: 'postSplashScreenTheme' }, _: '@style/AppTheme' },
              { $: { name: 'android:windowSplashScreenBehavior' }, _: 'icon_preferred' },
            ],
          },
        ],
      },
    };
    const out = markApi33Items(styles);
    expect(out.resources.style[0].item[1].$['tools:targetApi']).toBe('33');
    expect(out.resources.style[0].item[0].$['tools:targetApi']).toBeUndefined();
    expect(out.resources.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
  });
});

describe('withStandaloneDebug', () => {
  const { addStandaloneDebug } = require('../plugins/withStandaloneDebug');
  const gradle = 'react {\n    // debuggableVariants = ["liteDebug", "prodDebug"]\n}\n';

  it('adds the property-controlled debuggableVariants line once', () => {
    const once = addStandaloneDebug(gradle);
    expect(once).toContain("findProperty('focusBubble.standaloneDebug')");
    expect(addStandaloneDebug(once)).toBe(once);
  });

  it('fails loudly if the Expo template changes', () => {
    expect(() => addStandaloneDebug('react {}')).toThrow(/debuggableVariants marker/);
  });
});

describe('withFocusNative', () => {
  const {
    applyToManifest,
    PERMISSIONS,
  } = require('../modules/focus-native/plugin/withFocusNative');
  const base = () => ({
    manifest: {
      'uses-permission': [{ $: { 'android:name': 'android.permission.VIBRATE' } }],
      application: [{ $: {}, activity: [] }],
    },
  });
  const names = (list) => list.map((i) => i.$['android:name']);

  it('declares exactly the ARCHITECTURE §8 permissions, without duplicates', () => {
    const out = applyToManifest(applyToManifest(base()));
    expect(names(out.manifest['uses-permission']).sort()).toEqual([...PERMISSIONS].sort());
    expect(PERMISSIONS).toEqual([
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
    ]);
    for (const banned of ['USE_EXACT_ALARM', 'FOREGROUND_SERVICE', 'INTERNET']) {
      expect(PERMISSIONS.join()).not.toContain(banned);
    }
  });

  it('exports only the boot receiver', () => {
    const app = applyToManifest(base()).manifest.application[0];
    const exported = [...app.receiver, ...app.service]
      .filter((c) => c.$['android:exported'] === 'true')
      .map((c) => c.$['android:name']);
    expect(exported).toEqual(['com.corexlr.focusbubble.focusnative.BootReceiver']);
    expect(names(app.receiver)).toHaveLength(3);
    expect(names(app.service)).toEqual([
      'com.corexlr.focusbubble.focusnative.FocusHeadlessService',
    ]);
  });
});
