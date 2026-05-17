import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';

const THEME = {
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', sub: '#9ca3af' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', sub: '#6b7280' },
};

type RunStatus = 'success' | 'failed' | 'running' | 'partial';

interface Run {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

const STATUS_COLOR: Record<RunStatus, string> = {
  success: '#16a34a',
  failed:  '#ef4444',
  running: '#3b82f6',
  partial: '#f59e0b',
};

const STATUS_BG: Record<RunStatus, string> = {
  success: '#16a34a18',
  failed:  '#ef444418',
  running: '#3b82f618',
  partial: '#f59e0b18',
};

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'WorkflowRuns'>;

export function RunsScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workflowId, workflowName } = route.params;
  const { t } = useLang();

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const { data } = await api.get<{ runs: Run[] }>(`/workflows/${workflowId}/runs?limit=50`);
      setRuns(data.runs);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [workflowId]);

  useFocusEffect(useCallback(() => { fetchRuns(); }, [fetchRuns]));

  const onRefresh = () => { setRefreshing(true); fetchRuns(); };

  const statusLabel: Record<RunStatus, string> = {
    success: t.runSuccess,
    failed:  t.runFailed,
    running: t.runRunning,
    partial: t.runPartial,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>{workflowName}</Text>
          <Text style={[styles.headerSub, { color: c.muted }]}>{t.runsTitle}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={c.muted} /></View>
      ) : runs.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={28} color={c.muted} />
          </View>
          <Text style={[styles.emptyText, { color: c.muted }]}>{t.noRuns}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
        >
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {runs.map((run, i) => (
              <TouchableOpacity
                key={run.id}
                style={[styles.row, { borderBottomColor: c.border }, i === runs.length - 1 && styles.rowLast]}
                onPress={() => navigation.navigate('RunDetail', { runId: run.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.badge, { backgroundColor: STATUS_BG[run.status] }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[run.status] }]}>
                    {statusLabel[run.status]}
                  </Text>
                </View>

                <View style={styles.rowCenter}>
                  <Text style={[styles.date, { color: c.text }]}>
                    {new Date(run.startedAt).toLocaleString()}
                  </Text>
                  <Text style={[styles.duration, { color: c.sub }]}>
                    {t.runDuration} : {formatMs(run.durationMs)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={14} color={c.sub} />
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyText: { fontSize: 14 },

  scroll: { padding: 24 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },
  rowCenter: { flex: 1, minWidth: 0 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  date: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  duration: { fontSize: 11 },
});
