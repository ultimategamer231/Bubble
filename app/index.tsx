import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, space, type } from '@/design/tokens';
import { useTheme } from '@/design/useTheme';

/** Phase 0 shell: brand background and title only. Real screens arrive in Phase 4. */
export default function FocusShell() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Focus Bubble
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  title: { fontFamily: fonts.displayBold, fontSize: type.title },
});
