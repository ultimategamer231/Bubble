const { RELEASE_MANIFEST } = require('../plugins/withReleaseNoInternet');

describe('withReleaseNoInternet', () => {
  it('removes INTERNET with tools:node="remove"', () => {
    expect(RELEASE_MANIFEST).toContain(
      '<uses-permission android:name="android.permission.INTERNET" tools:node="remove" />',
    );
    expect(RELEASE_MANIFEST).toContain('xmlns:tools="http://schemas.android.com/tools"');
  });
});
