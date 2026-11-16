// App entry. Registers the background task first (Android may ask for it the moment the
// JS bundle has loaded, with no screen open), then starts the normal Expo Router app.
require('./src/services/headless').registerHeadlessTask();
require('expo-router/entry');
