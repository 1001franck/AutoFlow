import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { RootStackParamList } from '../../App';
import { setAccessToken } from '../api/client';
import { useLang } from '../contexts/LanguageContext';
import type { Lang } from '../i18n';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af' },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export function SettingsScreen() {
  const c = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const { t, lang, setLang } = useLang();
  const [email, setEmail] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userEmail').then((e) => setEmail(e ?? ''));
  }, []);

  const toggleLang = (next: Lang) => setLang(next);

  const handleLogout = async () => {
    setAccessToken('');
    await AsyncStorage.multiRemove(['isAuth', 'userEmail', 'lang']);
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: c.text }]}>{t.account}</Text>

        {/* Carte utilisateur */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.text }]}>
            <Text style={[styles.avatarLetter, { color: c.bg }]}>
              {email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.emailText, { color: c.text }]} numberOfLines={1}>{email}</Text>
        </View>

        {/* Langue */}
        <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.rowLabel, { color: c.text }]}>{t.language}</Text>
          <View style={[styles.segmented, { borderColor: c.border }]}>
            {(['fr', 'en'] as Lang[]).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => toggleLang(l)}
                activeOpacity={0.7}
                style={[
                  styles.segment,
                  lang === l && { backgroundColor: c.text },
                ]}
              >
                <Text style={[styles.segmentText, { color: lang === l ? c.bg : c.muted }]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: c.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 28 },

  card: {
    borderWidth: 1, borderRadius: 14,
    padding: 20, flexDirection: 'row',
    alignItems: 'center', gap: 14, marginBottom: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700' },
  emailText: { fontSize: 14, fontWeight: '500', flex: 1 },

  row: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '500' },

  segmented: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 14, paddingVertical: 6,
  },
  segmentText: { fontSize: 12, fontWeight: '700' },

  logoutBtn: {
    height: 48, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
