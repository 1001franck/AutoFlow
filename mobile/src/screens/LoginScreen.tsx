import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

const THEME = {
  dark: {
    bg: '#000000',
    text: '#ffffff',
    muted: '#4a4a4a',
    label: '#333333',
    line: '#1e1e1e',
    placeholder: '#2e2e2e',
    btnBg: '#ffffff',
    btnText: '#000000',
    googleBorder: '#1e1e1e',
  },
  light: {
    bg: '#f7f7f7',
    text: '#0a0a0a',
    muted: '#aaaaaa',
    label: '#bbbbbb',
    line: '#dedede',
    placeholder: '#d0d0d0',
    btnBg: '#0a0a0a',
    btnText: '#ffffff',
    googleBorder: '#e0e0e0',
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

      // 2. Ouvre la page Google dans un navigateur in-app (sans attendre la fermeture)
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
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Marque en haut */}
        <View style={styles.brand}>
          <Text style={[styles.brandIcon, { color: c.text }]}>⚡</Text>
          <Text style={[styles.brandName, { color: c.text }]}>AutoFlow</Text>
        </View>

        {/* Titre principal */}
        <Text style={[styles.heading, { color: c.text }]}>
          {mode === 'login' ? 'Bon retour.' : 'Bienvenue.'}
        </Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          {mode === 'login'
            ? 'Connectez-vous pour continuer.'
            : 'Créez votre compte en quelques secondes.'}
        </Text>

        {/* Google */}
        <TouchableOpacity
          style={[styles.googleBtn, { borderColor: c.googleBorder }]}
          onPress={handleGoogleSignIn}
          activeOpacity={0.6}
          disabled={loading}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.googleLabel, { color: c.text }]}>Continuer avec Google</Text>
        </TouchableOpacity>

        {/* Séparateur */}
        <View style={styles.sep}>
          <View style={[styles.sepLine, { backgroundColor: c.line }]} />
          <Text style={[styles.sepText, { color: c.muted }]}>ou</Text>
          <View style={[styles.sepLine, { backgroundColor: c.line }]} />
        </View>

        {/* Champ email */}
        <Text style={[styles.label, { color: c.label }]}>EMAIL</Text>
        <TextInput
          style={[styles.input, { borderBottomColor: c.line, color: c.text }]}
          placeholder="vous@exemple.com"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Champ mot de passe */}
        <Text style={[styles.label, { color: c.label, marginTop: 28 }]}>MOT DE PASSE</Text>
        <TextInput
          style={[styles.input, { borderBottomColor: c.line, color: c.text }]}
          placeholder="••••••••"
          placeholderTextColor={c.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Bouton pill */}
        <TouchableOpacity
          style={[styles.pill, { backgroundColor: c.btnBg, marginTop: error ? 20 : 36 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={c.btnText} />
            : <Text style={[styles.pillText, { color: c.btnText }]}>
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
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 80, paddingBottom: 48 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 64 },
  brandIcon: { fontSize: 18 },
  brandName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

  heading: { fontSize: 44, fontWeight: '800', letterSpacing: -1.8, lineHeight: 48, marginBottom: 10 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 44 },

  googleBtn: {
    height: 52, borderRadius: 26, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 36,
  },
  googleG: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleLabel: { fontSize: 14, fontWeight: '500' },

  sep: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 36 },
  sepLine: { flex: 1, height: 1 },
  sepText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  input: {
    height: 44, borderBottomWidth: 1,
    fontSize: 16, paddingBottom: 8, paddingHorizontal: 0,
  },

  error: { fontSize: 13, color: '#ef4444', marginTop: 16 },

  pill: {
    height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  pillText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  toggle: { marginTop: 28, alignItems: 'center' },
  toggleText: { fontSize: 14 },
});
