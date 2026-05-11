import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

type StepStatus = 'success' | 'failed' | 'running' | 'skipped';
type RunStatus = 'success' | 'failed' | 'running' | 'partial';

interface StepLog {
  id: string;
  stepId: string;
  status: StepStatus;
  startedAt: string;
  finishedAt: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  step: { name: string; type: string };
}

interface RunDetail {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  stepLogs: StepLog[];
}

const STATUS_VARIANT: Record<RunStatus | StepStatus, 'success' | 'error' | 'running' | 'warning' | 'default'> = {
  success: 'success',
  failed:  'error',
  running: 'running',
  partial: 'warning',
  skipped: 'default',
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed')  return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-(--color-muted-foreground)" />;
}

function duration(start: string, end: string | null): string {
  if (!end) return '…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StepRow({ log }: { log: StepLog }) {
  const [open, setOpen] = useState(false);
  const hasDetails = log.output !== null || log.error !== null;

  return (
    <div className="border-b border-(--color-border) last:border-0">
      <button
        onClick={() => hasDetails && setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-(--color-muted) transition-colors disabled:cursor-default"
        disabled={!hasDetails}
      >
        {/* Icône statut */}
        <StepIcon status={log.status} />

        {/* Nom + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{log.step.name}</p>
          <p className="text-xs text-(--color-muted-foreground) mt-0.5">{log.step.type}</p>
        </div>

        {/* Durée */}
        <span className="text-xs text-(--color-muted-foreground) tabular-nums shrink-0">
          {duration(log.startedAt, log.finishedAt)}
        </span>

        {/* Chevron si détails */}
        {hasDetails && (
          open
            ? <ChevronDown className="h-3.5 w-3.5 text-(--color-muted-foreground) shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-(--color-muted-foreground) shrink-0" />
        )}
      </button>

      {/* Détails dépliés */}
      {open && (
        <div className="px-6 pb-4 flex flex-col gap-2">
          {log.error && (
            <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {log.error}
            </pre>
          )}
          {log.output && (
            <pre className="text-xs bg-(--color-muted) rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-(--color-foreground)">
              {JSON.stringify(log.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function RunDetail() {
  const { t } = useTranslation();
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery<RunDetail>({
    queryKey: ['run', runId],
    queryFn: () => api.get(`/runs/${runId}`).then((r) => r.data),
    enabled: Boolean(runId),
  });

  // Mise à jour live si le run est encore en cours
  useSocket('run:update', (payload) => {
    const p = payload as { runId: string };
    if (p.runId === runId) {
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
    }
  });

  return (
    <Layout title={t('run.title')}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{t('run.title')}</h2>
          {run && (
            <Badge variant={STATUS_VARIANT[run.status]}>
              {t(`run.${run.status}`)}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : !run ? null : (
        <div className="flex flex-col gap-6 max-w-2xl">
          {/* Méta */}
          <div className="flex gap-6 text-sm text-(--color-muted-foreground)">
            <span>{t('run.startedAt')} : {new Date(run.startedAt).toLocaleString()}</span>
            <span>{t('run.duration')} : {duration(run.startedAt, run.finishedAt)}</span>
          </div>

          {/* Timeline des étapes */}
          <div className="rounded-xl border border-(--color-border) bg-(--color-card)">
            {run.stepLogs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-(--color-muted-foreground) text-center">
                {t('run.noRuns')}
              </p>
            ) : (
              run.stepLogs.map((log) => <StepRow key={log.id} log={log} />)
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
