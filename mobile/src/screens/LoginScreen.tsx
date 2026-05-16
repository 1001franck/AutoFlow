import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import type { RootStackParamList } from '../../App';
import api, { setAccessToken } from '../api/client';

// Même palette que le web
const THEME = {
  light: {
    bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb',
    text: '#000000', muted: '#6b7280', placeholder: '#9ca3af',
    btnBg: '#000000', btnText: '#ffffff',
  },
  dark: {
    bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a',
    text: '#ffffff', muted: '#9ca3af', placeholder: '#6b7280',
    btnBg: '#ffffff', btnText: '#000000',
  },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = THEME[dark ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Le backend génère une URL Google + un sessionId unique
      const { data } = await api.get<{ sessionId: string; url: string }>('/auth/google/mobile/init');
      const { sessionId, url } = data;

      // 2. Ouvre la page Google dans un navigateur in-app
      WebBrowser.openBrowserAsync(url).catch(() => {});

      // 3. Poll toutes les secondes - le navigateur se ferme dès que l'auth est détectée
      for (let i = 0; i < 300; i++) {
        await new Promise(r => setTimeout(r, 1000));

        const { data: session } = await api.get<{
          status: 'pending' | 'success' | 'error' | 'expired';
          accessToken?: string;
          email?: string;
        }>(`/auth/google/mobile/poll/${sessionId}`);

        if (session.status === 'success' && session.accessToken) {
          await WebBrowser.dismissBrowser();
          setAccessToken(session.accessToken);
          await AsyncStorage.setItem('isAuth', '1');
          await AsyncStorage.setItem('userEmail', session.email ?? '');
          navigation.replace('Dashboard');
          return;
        }

        if (session.status === 'error' || session.status === 'expired') {
          await WebBrowser.dismissBrowser();
          setError('Connexion Google échouée');
          return;
        }
      }

      await WebBrowser.dismissBrowser();
      setError('Délai expiré, réessayez');
    } catch {
      setError('Connexion Google échouée');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      setAccessToken(data.accessToken);
      await AsyncStorage.setItem('isAuth', '1');
      await AsyncStorage.setItem('userEmail', email);
      navigation.replace('Dashboard');
    } catch {
      setError(mode === 'login' ? 'Identifiants incorrects' : 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={[styles.logoBox, { backgroundColor: c.text }]}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={[styles.logoName, { color: c.text }]}>AutoFlow</Text>
        </View>

        {/* Titre */}
        <Text style={[styles.title, { color: c.text }]}>
          {mode === 'login' ? 'Bon retour' : 'Créer un compte'}
        </Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {mode === 'login'
            ? 'Connectez-vous à votre espace AutoFlow'
            : 'Commencez à automatiser en quelques minutes'}
        </Text>

        {/* Bouton Google */}
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={handleGoogleSignIn}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.googleLabel, { color: c.text }]}>Continuer avec Google</Text>
        </TouchableOpacity>

        {/* Séparateur */}
        <View style={styles.sep}>
          <View style={[styles.sepLine, { backgroundColor: c.border }]} />
          <Text style={[styles.sepText, { color: c.muted }]}>ou</Text>
          <View style={[styles.sepLine, { backgroundColor: c.border }]} />
        </View>

        {/* Label + champ email */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>Adresse e-mail</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="vous@exemple.com"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Label + champ mot de passe */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>Mot de passe</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="••••••••"
          placeholderTextColor={c.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Bouton principal */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: c.btnBg }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={c.btnText} />
            : <Text style={[styles.submitLabel, { color: c.btnText }]}>
                {mode === 'login' ? 'Connexion' : 'Créer mon compte'}
              </Text>}
        </TouchableOpacity>

        {/* Bascule login / register */}
        <TouchableOpacity
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={styles.toggle}
        >
          <Text style={[styles.toggleText, { color: c.muted }]}>
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
            <Text style={{ color: c.text, fontWeight: '600' }}>
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  logoBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 17 },
  logoName: { fontSize: 19, fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },

  googleBtn: {
    height: 48, borderWidth: 1, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 20,
  },
  googleG: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleLabel: { fontSize: 15, fontWeight: '500' },

  sep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sepLine: { flex: 1, height: 1 },
  sepText: { fontSize: 13 },

  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, marginBottom: 14,
  },

  error: { fontSize: 13, color: '#ef4444', marginBottom: 10 },

  submitBtn: {
    height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitLabel: { fontSize: 15, fontWeight: '600' },

  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14 },
});
