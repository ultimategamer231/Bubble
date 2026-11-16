import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, minTouch, space, type } from '@/design/tokens';
import { useTheme } from '@/design/useTheme';

/** Shell: brand background and title only. Real screens arrive in Phase 4. */
export default function FocusShell() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Focus Bubble
      </Text>
      {__DEV__ || process.env.EXPO_PUBLIC_DEBUG_SCREEN === '1' ? (
        <Link href="/debug" style={[styles.link, { color: theme.primary }]}>
          Open native spike (debug build)
        </Link>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  title: { fontFamily: fonts.displayBold, fontSize: type.title },
  link: {
    fontSize: type.body,
    minHeight: minTouch,
    textAlignVertical: 'center',
    marginTop: space.xl,
  },
});
