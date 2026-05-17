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
  light: { bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb', text: '#000000', muted: '#6b7280', sub: '#9ca3af', code: '#f3f4f6' },
  dark:  { bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a', text: '#ffffff', muted: '#9ca3af', sub: '#6b7280', code: '#111111' },
};

type RunStatus  = 'success' | 'failed' | 'running' | 'partial';
type StepStatus = 'success' | 'failed' | 'running' | 'skipped';

interface StepLog {
  id: string;
  position: number;
  status: StepStatus;
  durationMs: number | null;
  output: Record<string, unknown> | null;
  error: string | null;
  step: { connector: string; action: string } | null;
}

interface RunDetail {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  stepLogs: StepLog[];
  workflow: { name: string };
}

const STATUS_COLOR: Record<RunStatus | StepStatus, string> = {
  success: '#16a34a',
  failed:  '#ef4444',
  running: '#3b82f6',
  partial: '#f59e0b',
  skipped: '#9ca3af',
};

const STATUS_BG: Record<RunStatus | StepStatus, string> = {
  success: '#16a34a18',
  failed:  '#ef444418',
  running: '#3b82f618',
  partial: '#f59e0b18',
  skipped: '#9ca3af18',
};

const STEP_ICON: Record<StepStatus, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  failed:  'close-circle',
  running: 'sync',
  skipped: 'remove-circle-outline',
};

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RunDetail'>;

function StepRow({ log, c }: { log: StepLog; c: typeof THEME.dark }) {
  const [open, setOpen] = useState(false);
  const hasDetails = log.output !== null || log.error !== null;
  const label = log.step ? `${log.step.connector}.${log.step.action}` : `Étape ${log.position + 1}`;

  return (
    <View style={{ borderBottomColor: c.border }}>
      <TouchableOpacity
        style={styles.stepRow}
        onPress={() => hasDetails && setOpen(o => !o)}
        activeOpacity={hasDetails ? 0.7 : 1}
      >
        <Ionicons name={STEP_ICON[log.status]} size={18} color={STATUS_COLOR[log.status]} />
        <Text style={[styles.stepLabel, { color: c.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.stepDuration, { color: c.sub }]}>{formatMs(log.durationMs)}</Text>
        {hasDetails && (
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={13} color={c.sub} />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.stepDetails}>
          {log.error ? (
            <View style={[styles.codeBlock, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.codeText, { color: '#b91c1c' }]}>{log.error}</Text>
            </View>
          ) : null}
          {log.output ? (
            <View style={[styles.codeBlock, { backgroundColor: c.code }]}>
              <Text style={[styles.codeText, { color: c.muted }]}>{JSON.stringify(log.output, null, 2)}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function RunDetailScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { runId } = route.params;
  const { t } = useLang();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const { data } = await api.get<RunDetail>(`/runs/${runId}`);
      setRun(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [runId]);

  useFocusEffect(useCallback(() => { fetchRun(); }, [fetchRun]));

  const onRefresh = () => { setRefreshing(true); fetchRun(); };

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
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {run?.workflow.name ?? ''}
          </Text>
          {run && (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[run.status] }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[run.status] }]}>
                {statusLabel[run.status]}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={c.muted} /></View>
      ) : !run ? null : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
        >
          {/* Méta */}
          <View style={[styles.meta, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: c.muted }]}>{t.runStartedAt}</Text>
              <Text style={[styles.metaValue, { color: c.text }]}>
                {new Date(run.startedAt).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: c.border }]} />
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: c.muted }]}>{t.runDuration}</Text>
              <Text style={[styles.metaValue, { color: c.text }]}>{formatMs(run.durationMs)}</Text>
            </View>
          </View>

          {/* Timeline des étapes */}
          {run.stepLogs.length > 0 && (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {run.stepLogs.map((log, i) => (
                <View key={log.id} style={i < run.stepLogs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: c.border } : undefined}>
                  <StepRow log={log} c={c} />
                </View>
              ))}
            </View>
          )}
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
  headerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 24, gap: 16 },

  meta: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13, fontWeight: '500' },
  metaDivider: { height: 1, marginHorizontal: 16 },

  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  stepLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  stepDuration: { fontSize: 12 },

  stepDetails: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  codeBlock: { borderRadius: 8, padding: 12 },
  codeText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 17 },
});
