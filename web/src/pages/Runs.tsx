import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';
import api from '@/api/client';
import { useSocket } from '@/hooks/useSocket';

type RunStatus = 'success' | 'failed' | 'running' | 'partial';

interface GlobalRun {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  workflow: { name: string };
}

interface RunsResponse {
  runs: GlobalRun[];
  total: number;
}

const STATUS_VARIANT: Record<RunStatus, 'success' | 'error' | 'running' | 'warning' | 'default'> = {
  success: 'success',
  failed:  'error',
  running: 'running',
  partial: 'warning',
};

// Formate la durée stockée en ms en chaîne lisible
function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function Runs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<RunsResponse>({
    queryKey: ['runs-all'],
    queryFn: () => api.get('/runs?limit=50').then((r) => r.data),
  });

  // Rafraîchit la liste en temps réel quand un run se termine
  useSocket('run:update', () => {
    queryClient.invalidateQueries({ queryKey: ['runs-all'] });
  });

  const runs = data?.runs ?? [];

  return (
    <Layout title={t('nav.runs')}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('nav.runs')}</h2>
          {!isLoading && (
            <p className="text-sm text-(--color-muted-foreground) mt-1">
              {data?.total ?? 0} exécution{(data?.total ?? 0) !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-muted)">
            <Clock className="h-6 w-6 text-(--color-muted-foreground)" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-(--color-muted-foreground)">{t('run.noRuns')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-(--color-border) bg-(--color-card) divide-y divide-(--color-border)">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => navigate(`/runs/${run.id}`)}
              className="w-full flex items-center justify-between px-6 py-4 gap-4 hover:bg-(--color-muted) transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <Badge variant={STATUS_VARIANT[run.status]}>
                  {t(`run.${run.status}`)}
                </Badge>
                <div className="min-w-0">
                  {/* Nom du workflow affiché dans la liste globale */}
                  <p className="text-sm font-medium truncate">{run.workflow.name}</p>
                  <p className="text-xs text-(--color-muted-foreground) mt-0.5">
                    {new Date(run.startedAt).toLocaleString()}
                    {' · '}
                    {t('run.duration')} : {formatDuration(run.durationMs)}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-(--color-muted-foreground) shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}
