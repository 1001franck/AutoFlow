import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';

const THEME = {
  light: {
    bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb',
    text: '#000000', muted: '#6b7280', sub: '#9ca3af',
  },
  dark: {
    bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a',
    text: '#ffffff', muted: '#9ca3af', sub: '#6b7280',
  },
};

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerType: string;
  _count: { steps: number; runs: number };
}

const TRIGGER_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  cron:    'time-outline',
  webhook: 'link-outline',
  manual:  'hand-left-outline',
};

type C = typeof THEME.dark;
type Nav = NativeStackNavigationProp<RootStackParamList>;

function WorkflowRow({
  wf, c, isLast, toggling, running,
  onToggle, onRun, onDelete, onViewRuns,
}: {
  wf: Workflow; c: C; isLast: boolean;
  toggling: boolean; running: boolean;
  onToggle: () => void; onRun: () => void; onDelete: () => void; onViewRuns: () => void;
}) {
  const { t } = useLang();
  const triggerIcon = TRIGGER_ICON[wf.triggerType] ?? 'flash-outline';
  const triggerLabel: Record<string, string> = {
    cron: t.triggerCron, webhook: t.triggerWebhook, manual: t.triggerManual,
  };

  return (
    <View style={[styles.row, { borderBottomColor: c.border }, isLast && styles.rowLast]}>
      <TouchableOpacity style={styles.rowLeft} onPress={onViewRuns} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: wf.active ? '#16a34a18' : `${c.border}60` }]}>
          <Ionicons name={triggerIcon} size={16} color={wf.active ? '#16a34a' : c.muted} />
        </View>

        <View style={styles.rowCenter}>
          <Text style={[styles.wfName, { color: c.text }]} numberOfLines={1}>{wf.name}</Text>
          <Text style={[styles.wfMeta, { color: c.sub }]}>
            {triggerLabel[wf.triggerType] ?? wf.triggerType} · {t.stepsCount(wf._count.steps)} · {t.runsCount(wf._count.runs)}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <View style={[styles.badge, { backgroundColor: wf.active ? '#16a34a20' : `${c.border}80` }]}>
          <Text style={[styles.badgeText, { color: wf.active ? '#16a34a' : c.muted }]}>
            {wf.active ? t.active : t.inactive}
          </Text>
        </View>

        <TouchableOpacity onPress={onToggle} disabled={toggling} style={styles.actionBtn} activeOpacity={0.6}>
          {toggling
            ? <ActivityIndicator size="small" color={c.muted} />
            : <Ionicons name="power-outline" size={18} color={wf.active ? '#16a34a' : c.muted} />
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onRun} disabled={running} style={styles.actionBtn} activeOpacity={0.6}>
          {running
            ? <ActivityIndicator size="small" color={c.muted} />
            : <Ionicons name="play-outline" size={18} color={c.muted} />
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} style={styles.actionBtn} activeOpacity={0.6}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}


export function WorkflowsScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const { t } = useLang();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const { data } = await api.get<Workflow[]>('/workflows');
      setWorkflows(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchWorkflows(); }, [fetchWorkflows]));

  const onRefresh = () => { setRefreshing(true); fetchWorkflows(); };

  const handleToggle = async (wf: Workflow) => {
    setTogglingId(wf.id);
    try {
      const { data } = await api.patch<Workflow>(`/workflows/${wf.id}/toggle`);
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, active: data.active } : w));
    } catch {}
    finally { setTogglingId(null); }
  };

  const handleRun = async (wf: Workflow) => {
    setRunningId(wf.id);
    try {
      await api.post(`/workflows/${wf.id}/run`);
    } catch {}
    finally { setRunningId(null); }
  };

  const handleDelete = (wf: Workflow) => {
    Alert.alert(
      t.deleteTitle(wf.name),
      t.deleteMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workflows/${wf.id}`);
              setWorkflows(prev => prev.filter(w => w.id !== wf.id));
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>Workflows</Text>
          {!loading && (
            <Text style={[styles.headerCount, { color: c.muted }]}>
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('WorkflowCreate')}
          style={[styles.addIcon, { backgroundColor: c.text }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={c.bg} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.muted} />
        </View>
      ) : workflows.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="flash-outline" size={28} color={c.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{t.noWorkflows}</Text>
          <Text style={[styles.emptySub, { color: c.muted }]}>{t.noWorkflowsSub}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />
          }
        >
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {workflows.map((wf, i) => (
              <WorkflowRow
                key={wf.id}
                wf={wf}
                c={c}
                isLast={i === workflows.length - 1}
                toggling={togglingId === wf.id}
                running={runningId === wf.id}
                onToggle={() => handleToggle(wf)}
                onRun={() => handleRun(wf)}
                onDelete={() => handleDelete(wf)}
                onViewRuns={() => navigation.navigate('WorkflowRuns', { workflowId: wf.id, workflowName: wf.name })}
              />
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
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerCount: { fontSize: 12, marginTop: 2 },
  addIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  scroll: { padding: 24 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 12, borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },

  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  rowCenter: { flex: 1, minWidth: 0 },
  wfName: { fontSize: 14, fontWeight: '500', marginBottom: 3 },
  wfMeta: { fontSize: 11 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginRight: 4 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actionBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
