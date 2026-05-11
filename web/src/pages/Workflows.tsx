import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/api/client';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerType: string;
  _count: { steps: number; runs: number };
  createdAt: string;
}

export function Workflows() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows').then((r) => r.data),
  });

  return (
    <Layout title={t('workflow.title')}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('workflow.title')}</h2>
          <p className="text-sm text-(--color-muted-foreground) mt-1">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/workflows/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('workflow.new')}
        </Button>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState onNew={() => navigate('/workflows/new')} />
      ) : (
        <WorkflowList workflows={workflows} />
      )}
    </Layout>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-muted)">
        <Zap className="h-6 w-6 text-(--color-muted-foreground)" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t('workflow.noWorkflows')}</p>
        <p className="text-sm text-(--color-muted-foreground) mt-1">{t('workflow.createFirst')}</p>
      </div>
      <Button onClick={onNew} size="sm">
        <Plus className="h-4 w-4" />
        {t('workflow.new')}
      </Button>
    </div>
  );
}

function WorkflowList({ workflows }: { workflows: Workflow[] }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) divide-y divide-(--color-border)">
      {workflows.map((wf) => (
        <WorkflowRow key={wf.id} workflow={wf} />
      ))}
    </div>
  );
}

function WorkflowRow({ workflow }: { workflow: Workflow }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      {/* Infos */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-muted)">
          <Zap className="h-4 w-4 text-(--color-foreground)" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{workflow.name}</p>
          <p className="text-xs text-(--color-muted-foreground) mt-0.5">
            {workflow._count.steps} étape{workflow._count.steps !== 1 ? 's' : ''} · {workflow._count.runs} run{workflow._count.runs !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Badge statut */}
      <Badge variant={workflow.active ? 'success' : 'default'} className="shrink-0">
        {workflow.active ? t('workflow.active') : t('workflow.inactive')}
      </Badge>
    </div>
  );
}
