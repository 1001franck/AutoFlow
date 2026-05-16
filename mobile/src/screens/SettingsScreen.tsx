import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { RootStackParamList } from '../../App';
import { setAccessToken } from '../api/client';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af' },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export function SettingsScreen() {
  const c = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userEmail').then((v) => setEmail(v ?? ''));
  }, []);

  const handleLogout = async () => {
    setAccessToken('');
    await AsyncStorage.multiRemove(['isAuth', 'userEmail']);
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: c.text }]}>Compte</Text>

        {/* Carte utilisateur */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.text }]}>
            <Text style={[styles.avatarLetter, { color: c.bg }]}>
              {email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.emailText, { color: c.text }]} numberOfLines={1}>{email}</Text>
        </View>

        {/* Bouton déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: c.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Déconnexion</Text>
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
    alignItems: 'center', gap: 14, marginBottom: 16,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700' },
  emailText: { fontSize: 14, fontWeight: '500', flex: 1 },

  logoutBtn: {
    height: 48, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
