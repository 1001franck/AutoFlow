import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', sub: '#9ca3af' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', sub: '#6b7280' },
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  runId: string | null;
  createdAt: string;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export function NotificationsScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const { t } = useLang();

  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      setNotifs(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchNotifs(); }, [fetchNotifs]));

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handlePress = (notif: Notification) => {
    if (!notif.read) markRead(notif.id);
    if (notif.runId) navigation.navigate('RunDetail', { runId: notif.runId });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>{t.notifications}</Text>
          {unread > 0 && (
            <Text style={[styles.unreadCount, { color: c.muted }]}>
              {unread} non lue{unread > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: c.muted }]}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={c.muted} /></View>
      ) : notifs.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="notifications-outline" size={28} color={c.muted} />
          </View>
          <Text style={[styles.emptyText, { color: c.muted }]}>{t.noRuns}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifs(); }} tintColor={c.muted} />}
        >
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {notifs.map((n, i) => (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.row,
                  { borderBottomColor: c.border },
                  i === notifs.length - 1 && styles.rowLast,
                  !n.read && { backgroundColor: scheme === 'dark' ? '#ffffff08' : '#00000005' },
                ]}
                onPress={() => handlePress(n)}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: n.read ? 'transparent' : '#ef4444' }]} />

                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.notifTitle, { color: c.text }]} numberOfLines={1}>{n.title}</Text>
                    <Text style={[styles.time, { color: c.sub }]}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  <Text style={[styles.notifMsg, { color: c.muted }]} numberOfLines={2}>{n.message}</Text>
                </View>

                {n.runId && <Ionicons name="chevron-forward" size={14} color={c.sub} />}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '700' },
  unreadCount: { fontSize: 12, marginTop: 3 },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  markAllText: { fontSize: 13 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyText: { fontSize: 14 },

  card: { borderTopWidth: 0, borderBottomWidth: 1, borderLeftWidth: 0, borderRightWidth: 0, borderColor: 'transparent' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },

  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  rowContent: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  time: { fontSize: 11, marginLeft: 8, flexShrink: 0 },
  notifMsg: { fontSize: 12, lineHeight: 17 },
});
