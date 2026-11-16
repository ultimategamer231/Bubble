/**
 * Config plugin: lets CI build a debug APK that runs on a phone without a computer.
 *
 * A normal debug build contains no JavaScript; it downloads it from Metro (the dev server)
 * on your computer. The owner tests phase builds on his phone with no computer attached,
 * so CI passes `-PfocusBubble.standaloneDebug=true`, which makes Gradle bundle the JS into
 * the debug APK. React Native then uses that bundle whenever Metro isn't reachable.
 * Without the flag (local development) nothing changes.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// debuggableVariants = ["liteDebug", "prodDebug"]';
const LINE =
  "debuggableVariants = (findProperty('focusBubble.standaloneDebug') ?: 'false').toBoolean() ? [] : ['debug']";

function addStandaloneDebug(contents) {
  if (contents.includes(LINE)) return contents;
  if (!contents.includes(MARKER)) {
    throw new Error(
      'withStandaloneDebug: could not find the debuggableVariants marker in app/build.gradle. ' +
        'The Expo template changed; update plugins/withStandaloneDebug.js.',
    );
  }
  return contents.replace(MARKER, `${MARKER}\n    ${LINE}`);
}

function withStandaloneDebug(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addStandaloneDebug(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = withStandaloneDebug;
module.exports.addStandaloneDebug = addStandaloneDebug;
