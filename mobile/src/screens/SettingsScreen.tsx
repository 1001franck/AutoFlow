import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { RootStackParamList } from '../../App';
import { setAccessToken } from '../api/client';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';
import type { Lang } from '../i18n';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', input: '#f9fafb' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', input: '#111111' },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export function SettingsScreen() {
  const c = THEME[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const { t, lang, setLang } = useLang();
  const [email, setEmail] = useState('');

  // Changer mot de passe
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userEmail').then((e) => setEmail(e ?? ''));
  }, []);

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess(false);
    if (newPwd !== confirmPwd) { setPwdError(t.passwordMismatch); return; }
    if (newPwd.length < 8) { setPwdError(t.passwordTooShort); return; }
    setPwdLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword: currentPwd, newPassword: newPwd });
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch {
      setPwdError(t.passwordIncorrect);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    setAccessToken('');
    await AsyncStorage.multiRemove(['isAuth', 'userEmail', 'lang']);
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.text }]}>{t.account}</Text>

        {/* Profil */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.text }]}>
            <Text style={[styles.avatarLetter, { color: c.bg }]}>
              {email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]} numberOfLines={1}>
              {email.split('@')[0]}
            </Text>
            <Text style={[styles.profileEmail, { color: c.muted }]} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        {/* Sécurité */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text, borderBottomColor: c.border }]}>{t.security}</Text>
          <View style={styles.sectionBody}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>{t.currentPassword}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>{t.newPassword}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                value={newPwd}
                onChangeText={setNewPwd}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>{t.confirmPassword}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
              />
            </View>

            {pwdError ? <Text style={styles.errorText}>{pwdError}</Text> : null}
            {pwdSuccess ? <Text style={styles.successText}>{t.passwordUpdated}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.text }, (pwdLoading || !currentPwd || !newPwd || !confirmPwd) && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              activeOpacity={0.8}
              disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
            >
              {pwdLoading
                ? <ActivityIndicator color={c.bg} size="small" />
                : <Text style={[styles.saveBtnText, { color: c.bg }]}>{t.updatePassword}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Langue */}
        <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.rowLabel, { color: c.text }]}>{t.language}</Text>
          <View style={[styles.segmented, { borderColor: c.border }]}>
            {(['fr', 'en'] as Lang[]).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                activeOpacity={0.7}
                style={[styles.segment, lang === l && { backgroundColor: c.text }]}
              >
                <Text style={[styles.segmentText, { color: lang === l ? c.bg : c.muted }]}>
                  {l === 'fr' ? 'Français' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: c.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },

  card: {
    borderWidth: 1, borderRadius: 14,
    padding: 20, flexDirection: 'row',
    alignItems: 'center', gap: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter: { fontSize: 17, fontWeight: '700' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 15, fontWeight: '600' },
  profileEmail: { fontSize: 12, marginTop: 2 },

  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  sectionBody: { padding: 20, gap: 14 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '500' },
  input: {
    height: 44, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, fontSize: 14,
  },

  errorText: { fontSize: 12, color: '#ef4444' },
  successText: { fontSize: 12, color: '#16a34a' },

  saveBtn: {
    height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },

  row: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 14, fontWeight: '500' },

  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  segment: { paddingHorizontal: 14, paddingVertical: 6 },
  segmentText: { fontSize: 12, fontWeight: '600' },

  logoutBtn: {
    height: 48, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
