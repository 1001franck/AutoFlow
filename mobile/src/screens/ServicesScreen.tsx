import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../contexts/LanguageContext';
import api from '../api/client';
import type { Tr } from '../i18n';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', sub: '#9ca3af' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', sub: '#6b7280' },
};

interface ServiceDef {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  descKey: keyof Tr;
}

const SERVICES: ServiceDef[] = [
  { id: 'gmail',    name: 'Gmail',    icon: 'mail-outline',          descKey: 'serviceGmailDesc' },
  { id: 'discord',  name: 'Discord',  icon: 'chatbubbles-outline',   descKey: 'serviceDiscordDesc' },
  { id: 'telegram', name: 'Telegram', icon: 'paper-plane-outline',   descKey: 'serviceTelegramDesc' },
  { id: 'notion',   name: 'Notion',   icon: 'document-text-outline', descKey: 'serviceNotionDesc' },
  { id: 'webhook',  name: 'Webhook',  icon: 'link-outline',          descKey: 'serviceWebhookDesc' },
];

interface Credential { id: string; connector: string; }

export function ServicesScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLang();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCredentials = async () => {
    try {
      const { data } = await api.get<Credential[]>('/credentials');
      setCredentials(data);
    } catch {}
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchCredentials(); }, []);

  const countFor = (id: string) => credentials.filter(cr => cr.connector === id).length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{t.services}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>{t.servicesSubtitle}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCredentials(); }} tintColor={c.muted} />}
      >
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {SERVICES.map((svc, i) => {
            const count = countFor(svc.id);
            const connected = count > 0;
            return (
              <View
                key={svc.id}
                style={[styles.row, { borderBottomColor: c.border }, i === SERVICES.length - 1 && styles.rowLast]}
              >
                <View style={[styles.iconWrap, { backgroundColor: connected ? '#16a34a18' : c.border }]}>
                  <Ionicons name={svc.icon} size={18} color={connected ? '#16a34a' : c.muted} />
                </View>

                <View style={styles.rowCenter}>
                  <Text style={[styles.svcName, { color: c.text }]}>{svc.name}</Text>
                  <Text style={[styles.svcDesc, { color: c.sub }]} numberOfLines={2}>
                    {t[svc.descKey] as string}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: connected ? '#16a34a18' : c.border }]}>
                  <Text style={[styles.badgeText, { color: connected ? '#16a34a' : c.muted }]}>
                    {connected ? t.serviceConnected(count) : t.serviceNotConnected}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[styles.hint, { color: c.sub }]}>{t.serviceManageWeb}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },

  scroll: { padding: 24 },

  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },

  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  rowCenter: { flex: 1, minWidth: 0 },
  svcName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  svcDesc: { fontSize: 12, lineHeight: 17 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  hint: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
