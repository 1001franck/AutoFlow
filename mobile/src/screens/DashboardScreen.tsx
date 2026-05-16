import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import type { RootStackParamList } from '../../App';
import api, { setAccessToken } from '../api/client';

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

// Construit les 7 derniers jours et fusionne avec les données réelles (même logique que le web)
function buildChartData(points: DayPoint[]) {
  const map = new Map(points.map((p) => [p.date, p.count]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    return { label, runs: map.get(key) ?? 0 };
  });
}

// Graphique area SVG — utilise react-native-svg déjà installé
function AreaChart({ data, color }: { data: number[]; color: string }) {
  const W = Dimensions.get('window').width - 96; // largeur carte - padding
  const H = 100;
  const max = Math.max(...data, 1);

  // Calcule les coordonnées de chaque point
  const coords = data.map((v, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * W : W / 2,
    y: H - 8 - (v / max) * (H - 16),
  }));

  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill="url(#areaGrad)" />
      <Path d={line} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export function DashboardScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardStats>('/dashboard/stats');
      setStats(data);
    } catch {
      // Erreur silencieuse — les données restent vides
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Charge l'email depuis le stockage local et les stats depuis l'API
    AsyncStorage.getItem('userEmail').then((v) => setEmail(v ?? ''));
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    setAccessToken('');
    await AsyncStorage.multiRemove(['isAuth', 'userEmail']);
    navigation.replace('Login');
  };

  const chartData = buildChartData(stats?.runsLast7Days ?? []);
  const chartValues = chartData.map((d) => d.runs);
  const chartColor = scheme === 'dark' ? '#ffffff' : '#0a0a0a';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>

      {/* En-tête */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>Tableau de bord</Text>
          {email ? <Text style={[styles.headerEmail, { color: c.muted }]}>{email}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Text style={[styles.logoutText, { color: c.muted }]}>Déconnexion</Text>
        </TouchableOpacity>
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
            <StatCard label="Exécutions totales" value={(stats?.totalRuns ?? 0).toLocaleString('fr-FR')} c={c} />
            <StatCard label="Taux de succès" value={`${stats?.successRate ?? 0}%`} c={c} />
            <StatCard label="Workflows actifs" value={String(stats?.activeWorkflows ?? 0)} c={c} />
          </View>

          {/* Graphique d'activité */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>7 derniers jours</Text>
            <View style={styles.chartWrap}>
              <AreaChart data={chartValues} color={chartColor} />
            </View>
            {/* Labels des jours sous le graphique */}
            <View style={styles.chartLabels}>
              {chartData.map((d, i) => (
                <Text key={i} style={[styles.chartLabel, { color: c.sub }]}>{d.label}</Text>
              ))}
            </View>
          </View>

          {/* Top workflows */}
          {(stats?.topWorkflows?.length ?? 0) > 0 && (
            <View style={[styles.card, styles.cardNoPad, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, styles.cardTitlePad, { color: c.text, borderBottomColor: c.border }]}>
                Top workflows
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
                        {wf.active ? 'Actif' : 'Inactif'}
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
