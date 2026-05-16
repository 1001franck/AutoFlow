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
} from 'react-native';

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

export function LoginScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <View style={[styles.logoBox, { backgroundColor: c.text }]}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={[styles.brandName, { color: c.text }]}>AutoFlow</Text>
        </View>

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
          style={[styles.googleButton, { borderColor: c.border, backgroundColor: c.card }]}
          activeOpacity={0.85}
        >
          <Text style={styles.googleLetter}>G</Text>
          <Text style={[styles.googleButtonText, { color: c.text }]}>Continuer avec Google</Text>
        </TouchableOpacity>

        {/* Separateur */}
        <View style={styles.separator}>
          <View style={[styles.separatorLine, { backgroundColor: c.border }]} />
          <Text style={[styles.separatorText, { color: c.muted }]}>ou</Text>
          <View style={[styles.separatorLine, { backgroundColor: c.border }]} />
        </View>

        {/* Champs */}
        <TextInput
          style={[styles.input, { borderColor: c.border, backgroundColor: c.card, color: c.text }]}
          placeholder="you@example.com"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={[styles.input, { borderColor: c.border, backgroundColor: c.card, color: c.text }]}
          placeholder="••••••••"
          placeholderTextColor={c.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity style={[styles.button, { backgroundColor: c.btnBg }]} activeOpacity={0.85}>
          <Text style={[styles.buttonText, { color: c.btnText }]}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.switchWrapper}
        >
          <Text style={[styles.switchText, { color: c.muted }]}>
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
            <Text style={[styles.switchLink, { color: c.text }]}>
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
  logoWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 18 },
  brandName: { fontSize: 20, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  googleButton: {
    height: 48, borderWidth: 1, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 20,
  },
  googleLetter: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { fontSize: 15, fontWeight: '500' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { fontSize: 13 },
  input: {
    height: 48, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, marginBottom: 14,
  },
  button: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  switchWrapper: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14 },
  switchLink: { fontWeight: '600' },
});
