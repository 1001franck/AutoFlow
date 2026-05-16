import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const THEME = {
  light: { bg: '#ffffff', text: '#000000', muted: '#6b7280' },
  dark:  { bg: '#0a0a0a', text: '#ffffff', muted: '#9ca3af' },
};

export function DashboardScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: c.text }]}>Tableau de bord</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>Bienvenue sur AutoFlow</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
});
