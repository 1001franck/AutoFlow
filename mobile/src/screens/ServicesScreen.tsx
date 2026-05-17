import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLang } from '../contexts/LanguageContext';
import api from '../api/client';
import type { Tr } from '../i18n';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', sub: '#9ca3af' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', sub: '#6b7280' },
};

// ─── Logos SVG ───────────────────────────────────────────────────────────────

function GmailLogo() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </Svg>
  );
}

function DiscordLogo() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="#5865F2">
      <Path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </Svg>
  );
}

function TelegramLogo() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="#26A5E4">
      <Path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.08 13.5l-2.95-.924c-.64-.203-.658-.64.136-.954l11.566-4.46c.537-.194 1.006.131.832.94l.26-.881z"/>
    </Svg>
  );
}

function NotionLogo({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
      <Path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </Svg>
  );
}

function WebhookLogo({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="5" r="2" />
      <Circle cx="5" cy="19" r="2" />
      <Circle cx="19" cy="19" r="2" />
      <Path d="M12 7c0 5-6 6-6 10M12 7c0 5 6 6 6 10M9.5 17.5 12 7" />
    </Svg>
  );
}

// ─── Données services ─────────────────────────────────────────────────────────

interface ServiceDef {
  id: string;
  name: string;
  logo: (color: string) => React.ReactElement;
  descKey: keyof Tr;
  branded: boolean;
}

const SERVICES: ServiceDef[] = [
  { id: 'gmail',    name: 'Gmail',    logo: () => <GmailLogo />,          descKey: 'serviceGmailDesc',    branded: true },
  { id: 'discord',  name: 'Discord',  logo: () => <DiscordLogo />,        descKey: 'serviceDiscordDesc',  branded: true },
  { id: 'telegram', name: 'Telegram', logo: () => <TelegramLogo />,       descKey: 'serviceTelegramDesc', branded: true },
  { id: 'notion',   name: 'Notion',   logo: (c) => <NotionLogo color={c}/>, descKey: 'serviceNotionDesc', branded: false },
  { id: 'webhook',  name: 'Webhook',  logo: (c) => <WebhookLogo color={c}/>, descKey: 'serviceWebhookDesc', branded: false },
];

interface Credential { id: string; connector: string; }

// ─── Écran ────────────────────────────────────────────────────────────────────

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCredentials(); }}
            tintColor={c.muted}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {SERVICES.map((svc, i) => {
            const count = countFor(svc.id);
            const connected = count > 0;
            const iconColor = svc.branded ? c.muted : c.muted;
            return (
              <View
                key={svc.id}
                style={[styles.row, { borderBottomColor: c.border }, i === SERVICES.length - 1 && styles.rowLast]}
              >
                <View style={[styles.iconWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                  {svc.logo(iconColor)}
                </View>

                <View style={styles.rowCenter}>
                  <Text style={[styles.svcName, { color: c.text }]}>{svc.name}</Text>
                  <Text style={[styles.svcDesc, { color: c.sub }]} numberOfLines={2}>
                    {t[svc.descKey] as string}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: connected ? '#16a34a18' : `${c.border}80` }]}>
                  <Text style={[styles.badgeText, { color: connected ? '#16a34a' : c.muted }]}>
                    {connected ? t.serviceConnected(count) : t.serviceNotConnected}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.webBtn, { borderColor: c.text }]}
          onPress={() => Linking.openURL('https://auto-flow-iota.vercel.app/dashboard')}
          activeOpacity={0.7}
        >
          <Text style={[styles.webBtnText, { color: c.text }]}>{t.serviceManageWeb}</Text>
        </TouchableOpacity>
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
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  rowCenter: { flex: 1, minWidth: 0 },
  svcName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  svcDesc: { fontSize: 12, lineHeight: 17 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  webBtn: {
    borderWidth: 1, borderRadius: 12, marginTop: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  webBtnText: { fontSize: 14, fontWeight: '600' },
});
