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
