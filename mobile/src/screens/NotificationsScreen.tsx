import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../contexts/LanguageContext';

const THEME = {
  light: { bg: '#ffffff', text: '#000000', muted: '#9ca3af' },
  dark:  { bg: '#0a0a0a', text: '#ffffff', muted: '#6b7280' },
};

export function NotificationsScreen() {
  const c = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { t } = useLang();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: c.text }]}>{t.notifications}</Text>
        <Text style={[styles.sub, { color: c.muted }]}>{t.comingSoon}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 14 },
});
