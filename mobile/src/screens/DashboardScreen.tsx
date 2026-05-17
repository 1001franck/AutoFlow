import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';

// Même palette que le web et le LoginScreen
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

interface DayPoint { date: string; count: number }
interface TopWorkflow { id: string; name: string; runs: number; active: boolean }
interface DashboardStats {
  totalRuns: number;
  successRate: number;
  activeWorkflows: number;
  runsLast7Days: DayPoint[];
  topWorkflows: TopWorkflow[];
}

function buildChartData(points: DayPoint[], days: number) {
  const map = new Map(points.map((p) => [p.date, p.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const label = days <= 7
      ? d.toLocaleDateString('fr-FR', { weekday: 'short' })
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return { label, runs: map.get(key) ?? 0 };
  });
}

function buildPath(data: number[], W: number, H: number) {
  const max = Math.max(...data, 1);
  const coords = data.map((v, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * W : W / 2,
    y: H - 8 - (v / max) * (H - 16),
  }));

  if (coords.length === 0) return { line: '', area: '' };

  // Courbe bezier cubique lisse — même rendu que type="monotone" sur le web
  let line = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const p = coords[i - 1];
    const c = coords[i];
    const cpX = ((p.x + c.x) / 2).toFixed(1);
    line += ` C${cpX},${p.y.toFixed(1)} ${cpX},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }

  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area };
}

function AreaChart({ data, color }: { data: number[]; color: string }) {
  const W = Dimensions.get('window').width - 96;
  const H = 100;
  // Animated.View overflow:hidden — width glisse de 0 → W, révèle courbe + fill ensemble
  const clipW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    clipW.setValue(0);
    Animated.timing(clipW, {
      toValue: W,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [data]);

  const { line, area } = buildPath(data, W, H);

  return (
    <Animated.View style={{ width: clipW, overflow: 'hidden' }}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={area} fill="url(#areaGrad)" />
        <Path
          d={line}
          stroke={color}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

// Carte statistique (même concept que StatCard sur le web)
function StatCard({ label, value, c }: { label: string; value: string; c: typeof THEME.dark }) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useLang();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [period, setPeriod] = useState<7 | 30>(7);

  const fetchStats = useCallback(async (days: 7 | 30 = 7) => {
    try {
      const { data } = await api.get<DashboardStats>(`/dashboard/stats?days=${days}`);
      setStats(data);
    } catch {
      // Erreur silencieuse — les données restent vides
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('userEmail').then((v) => setEmail(v ?? ''));
    fetchStats(period);
  }, [fetchStats]);

  const handlePeriod = (p: 7 | 30) => {
    setPeriod(p);
    fetchStats(p);
  };

  const chartData = buildChartData(stats?.runsLast7Days ?? [], period);
  const chartValues = chartData.map((d) => d.runs);
  const chartColor = scheme === 'dark' ? '#ffffff' : '#0a0a0a';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>

      {/* En-tête */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t.dashTitle}</Text>
        {email ? (
          <View style={[styles.pill, { backgroundColor: c.text }]}>
            <Text style={[styles.pillText, { color: c.bg }]}>
              {email.split('@')[0]}
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.muted} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Cartes de métriques */}
          <View style={styles.statsGrid}>
            <StatCard label={t.totalRuns} value={(stats?.totalRuns ?? 0).toLocaleString()} c={c} />
            <StatCard label={t.successRate} value={`${stats?.successRate ?? 0}%`} c={c} />
            <StatCard label={t.activeWorkflows} value={String(stats?.activeWorkflows ?? 0)} c={c} />
          </View>

          {/* Graphique d'activité */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0 }]}>{t.last7Days}</Text>
              <View style={[styles.periodToggle, { borderColor: c.border }]}>
                {([7, 30] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handlePeriod(p)}
                    style={[styles.periodBtn, period === p && { backgroundColor: c.text }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodBtnText, { color: period === p ? c.bg : c.muted }]}>
                      {p}j
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.chartWrap}>
              <AreaChart data={chartValues} color={chartColor} />
            </View>
            <View style={styles.chartLabels}>
              {chartData
                .filter((_, i) => period === 7 || i % 5 === 0 || i === chartData.length - 1)
                .map((d, i) => (
                  <Text key={i} style={[styles.chartLabel, { color: c.sub }]}>{d.label}</Text>
                ))}
            </View>
          </View>

          {/* Top workflows */}
          {(stats?.topWorkflows?.length ?? 0) > 0 && (
            <View style={[styles.card, styles.cardNoPad, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, styles.cardTitlePad, { color: c.text, borderBottomColor: c.border }]}>
                {t.topWorkflows}
              </Text>
              {stats!.topWorkflows.map((wf, i) => (
                <View
                  key={wf.id}
                  style={[
                    styles.wfRow,
                    { borderBottomColor: c.border },
                    i === stats!.topWorkflows.length - 1 && styles.wfRowLast,
                  ]}
                >
                  <View style={styles.wfLeft}>
                    <Text style={[styles.wfRank, { color: c.sub }]}>{i + 1}</Text>
                    <Text style={[styles.wfName, { color: c.text }]} numberOfLines={1}>{wf.name}</Text>
                  </View>
                  <View style={styles.wfRight}>
                    {/* Badge statut */}
                    <View style={[styles.badge, { backgroundColor: wf.active ? '#16a34a20' : `${c.border}80` }]}>
                      <Text style={[styles.badgeText, { color: wf.active ? '#16a34a' : c.muted }]}>
                        {wf.active ? t.active : t.inactive}
                      </Text>
                    </View>
                    <Text style={[styles.wfRuns, { color: c.muted }]}>{wf.runs.toLocaleString('fr-FR')}</Text>
                  </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerEmail: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '600' },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  logoutText: { fontSize: 13 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 24, gap: 16 },

  statsGrid: { gap: 12 },
  statCard: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  statLabel: { fontSize: 13, marginBottom: 6 },
  statValue: { fontSize: 32, fontWeight: '600', letterSpacing: -1 },

  card: { borderWidth: 1, borderRadius: 14, padding: 20 },
  cardNoPad: { padding: 0 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  cardTitlePad: { padding: 20, paddingBottom: 16, borderBottomWidth: 1, marginBottom: 0 },

  chartHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  periodToggle: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  periodBtnText: { fontSize: 12, fontWeight: '600' },

  chartWrap: { marginBottom: 10 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 10 },

  wfRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  wfRowLast: { borderBottomWidth: 0 },
  wfLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  wfRank: { fontSize: 12, width: 16, textAlign: 'center' },
  wfName: { fontSize: 14, fontWeight: '500', flex: 1 },
  wfRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  wfRuns: { fontSize: 13, minWidth: 30, textAlign: 'right' },
});
