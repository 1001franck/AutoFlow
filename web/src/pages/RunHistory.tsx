import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/api/client';

type RunStatus = 'success' | 'failed' | 'running' | 'partial';

interface Run {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  stepLogs: { id: string }[];
}

interface RunsResponse {
  runs: Run[];
  total: number;
}

const STATUS_VARIANT: Record<RunStatus, 'success' | 'error' | 'running' | 'warning' | 'default'> = {
  success: 'success',
  failed:  'error',
  running: 'running',
  partial: 'warning',
};

function duration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunHistory() {
  const { t } = useTranslation();
  const { id: workflowId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<RunsResponse>({
    queryKey: ['runs', workflowId],
    queryFn: () =>
      api.get(`/workflows/${workflowId}/runs?limit=50`).then((r) => r.data),
    enabled: Boolean(workflowId),
  });

  const runs = data?.runs ?? [];

  return (
    <Layout title={t('run.title')}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('run.title')}</h2>
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
                  <p className="text-sm text-(--color-muted-foreground)">
                    {new Date(run.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-(--color-muted-foreground) mt-0.5">
                    {t('run.duration')} : {duration(run.startedAt, run.finishedAt)}
                    {' · '}
                    {run.stepLogs.length} étape{run.stepLogs.length !== 1 ? 's' : ''}
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
