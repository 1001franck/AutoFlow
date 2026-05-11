import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, KeyRound, Trash2, FlaskConical } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import api from '@/api/client';

interface Credential {
  id: string;
  label: string;
  connector: string;
  createdAt: string;
}

const CONNECTORS = ['discord', 'telegram', 'gmail', 'notion', 'webhook'] as const;

const CONNECTOR_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  discord:  [{ key: 'botToken',  label: 'Bot token',   placeholder: 'Bot token Discord' }],
  telegram: [{ key: 'botToken',  label: 'Bot token',   placeholder: 'Token BotFather' }],
  gmail:    [
    { key: 'clientId',     label: 'Client ID',     placeholder: 'Google OAuth client ID' },
    { key: 'clientSecret', label: 'Client secret', placeholder: 'Google OAuth secret' },
    { key: 'refreshToken', label: 'Refresh token', placeholder: 'OAuth refresh token' },
    { key: 'email',        label: 'Email',         placeholder: 'compte@gmail.com' },
  ],
  notion:   [{ key: 'apiKey',    label: 'API key',     placeholder: 'secret_...' }],
  webhook:  [{ key: 'url',       label: 'URL',         placeholder: 'https://...' }],
};

export function Credentials() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);

  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ['credentials'],
    queryFn: () => api.get('/credentials').then((r) => r.data),
  });

  return (
    <Layout title={t('credential.title')}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('credential.title')}</h2>
          <p className="text-sm text-(--color-muted-foreground) mt-1">
            {credentials.length} identifiant{credentials.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('credential.new')}
        </Button>
      </div>

      {showForm && (
        <AddCredentialForm
          onClose={() => setShowForm(false)}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : credentials.length === 0 && !showForm ? (
        <EmptyState onNew={() => setShowForm(true)} />
      ) : (
        <CredentialList credentials={credentials} />
      )}
    </Layout>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-muted)">
        <KeyRound className="h-6 w-6 text-(--color-muted-foreground)" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t('credential.noCredentials')}</p>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Ajoutez vos tokens et clés API pour connecter vos services.
        </p>
      </div>
      <Button onClick={onNew} size="sm">
        <Plus className="h-4 w-4" />
        {t('credential.new')}
      </Button>
    </div>
  );
}

function CredentialList({ credentials }: { credentials: Credential[] }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) divide-y divide-(--color-border)">
      {credentials.map((c) => (
        <CredentialRow key={c.id} credential={c} />
      ))}
    </div>
  );
}

function CredentialRow({ credential }: { credential: Credential }) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.delete(`/credentials/${credential.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credentials'] }),
  });

  const test = useMutation({
    mutationFn: () => api.get(`/credentials/${credential.id}/test`),
  });

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-muted)">
          <KeyRound className="h-4 w-4 text-(--color-foreground)" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{credential.label}</p>
          <p className="text-xs text-(--color-muted-foreground) mt-0.5">
            {new Date(credential.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="default">{credential.connector}</Badge>

        <Button
          variant="ghost"
          size="icon"
          title="Tester"
          disabled={test.isPending}
          onClick={() => test.mutate()}
        >
          <FlaskConical className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          title="Supprimer"
          disabled={remove.isPending}
          onClick={() => { if (confirm(credential.label + ' ?')) remove.mutate(); }}
          className="text-(--color-destructive) hover:text-(--color-destructive)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AddCredentialForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [connector, setConnector] = useState<string>(CONNECTORS[0]);
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () =>
      api.post('/credentials', { label, connector, data: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      onClose();
    },
  });

  const handleField = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) p-6 mb-6">
      <h3 className="text-sm font-semibold mb-4">{t('credential.new')}</h3>

      <div className="flex flex-col gap-4 max-w-md">
        {/* Label */}
        <Input
          id="cred-label"
          label={t('credential.label')}
          placeholder="Mon compte Discord"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        {/* Sélecteur de connecteur */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('credential.connector')}</label>
          <select
            value={connector}
            onChange={(e) => { setConnector(e.target.value); setFields({}); }}
            className="h-10 w-full rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-sm text-(--color-foreground) outline-none focus:border-(--color-foreground) transition-colors"
          >
            {CONNECTORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Champs dynamiques selon le connecteur */}
        {(CONNECTOR_FIELDS[connector] ?? []).map((f) => (
          <Input
            key={f.key}
            id={`cred-${f.key}`}
            label={f.label}
            placeholder={f.placeholder}
            type="password"
            value={fields[f.key] ?? ''}
            onChange={(e) => handleField(f.key, e.target.value)}
          />
        ))}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            disabled={create.isPending || !label}
            onClick={() => create.mutate()}
          >
            {create.isPending ? t('common.loading') : t('common.save')}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
