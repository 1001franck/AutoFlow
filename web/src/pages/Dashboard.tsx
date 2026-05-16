import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, CheckCircle, Zap, type LucideIcon } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';
import { useSocket } from '@/hooks/useSocket';
import api from '@/api/client';

interface DayPoint {
  date: string;
  count: number;
}

interface TopWorkflow {
  id: string;
  name: string;
  runs: number;
  active: boolean;
}

interface DashboardStats {
  totalRuns: number;
  successRate: number;
  activeWorkflows: number;
  runsLast7Days: DayPoint[];
  topWorkflows: TopWorkflow[];
}

// Génère les 7 derniers jours et fusionne avec les données réelles
function buildChartData(points: DayPoint[], locale: string): { label: string; runs: number }[] {
  const map = new Map(points.map((p) => [p.date, p.count]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
    return { label, runs: map.get(key) ?? 0 };
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) px-6 py-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-(--color-muted-foreground)">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-muted)">
          <Icon className="h-4 w-4 text-(--color-foreground)" strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-(--color-muted-foreground) mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  // Rafraîchit les stats dès qu'un run se termine en temps réel
  useSocket('run:update', () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  });

  const chartData = buildChartData(data?.runsLast7Days ?? [], i18n.language);

  return (
    <Layout title={t('dashboard.title')}>
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* Cartes de métriques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={TrendingUp}
              label={t('dashboard.totalRuns')}
              value={(data?.totalRuns ?? 0).toLocaleString()}
            />
            <StatCard
              icon={CheckCircle}
              label={t('dashboard.successRate')}
              value={`${data?.successRate ?? 0}%`}
            />
            <StatCard
              icon={Zap}
              label={t('dashboard.activeWorkflows')}
              value={data?.activeWorkflows ?? 0}
            />
          </div>

          {/* Graphique d'activité */}
          <div className="rounded-xl border border-(--color-border) bg-(--color-card) px-6 py-5">
            <p className="text-sm font-medium mb-6">{t('dashboard.last7Days')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-foreground)',
                  }}
                  cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="runs"
                  stroke="var(--color-foreground)"
                  strokeWidth={1.5}
                  fill="url(#runsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-foreground)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top workflows */}
          {(data?.topWorkflows?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-(--color-border) bg-(--color-card)">
              <div className="px-6 py-4 border-b border-(--color-border)">
                <p className="text-sm font-medium">{t('dashboard.topWorkflows')}</p>
              </div>
              <ul>
                {data!.topWorkflows.map((wf, i) => (
                  <li
                    key={wf.id}
                    className="flex items-center justify-between px-6 py-3.5 border-b border-(--color-border) last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-(--color-muted-foreground) w-4 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{wf.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={wf.active ? 'success' : 'default'}>
                        {wf.active ? t('workflow.active') : t('workflow.inactive')}
                      </Badge>
                      <span className="text-sm tabular-nums text-(--color-muted-foreground)">
                        {wf.runs.toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
