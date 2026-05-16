import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, KeyRound, Trash2, FlaskConical } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import api from '@/api/client';
import { useToast } from '@/components/ui/Toast';

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
  notion:   [{ key: 'apiKey',    label: 'API key',     placeholder: 'secret_...' }],
  webhook:  [{ key: 'url',       label: 'URL',         placeholder: 'https://...' }],
};

export function Credentials() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ['credentials'],
    queryFn: () => api.get('/credentials').then((r) => r.data),
  });

  // Gère le retour depuis Google OAuth
  useEffect(() => {
    if (searchParams.get('gmailConnected') === '1') {
      toast(t('credential.gmailConnected'), 'success');
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('error')) {
      const err = searchParams.get('error');
      const msg = err === 'oauth_cancelled'
        ? t('credential.oauthCancelled')
        : err === 'oauth_expired'
          ? t('credential.oauthExpired')
          : err === 'no_refresh_token'
            ? t('credential.noRefreshToken')
            : t('common.error');
      toast(msg, 'error');
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <AddCredentialForm onClose={() => setShowForm(false)} />
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
          {t('credential.subtitle')}
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const remove = useMutation({
    mutationFn: () => api.delete(`/credentials/${credential.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credentials'] }); toast(t('credential.deleted'), 'info'); },
    onError: () => toast(t('common.error'), 'error'),
  });

  const test = useMutation({
    mutationFn: () => api.get(`/credentials/${credential.id}/test`),
    onSuccess: () => toast(t('credential.testOk'), 'success'),
    onError: () => toast(t('credential.testFail'), 'error'),
  });

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      {showConfirm && (
        <Dialog
          title={`${t('credential.delete')} « ${credential.label} » ?`}
          description={t('credential.deleteConfirm')}
          confirmLabel={t('credential.delete')}
          destructive
          onConfirm={() => remove.mutate()}
          onClose={() => setShowConfirm(false)}
        />
      )}
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
          title={t('credential.test')}
          disabled={test.isPending}
          onClick={() => test.mutate()}
        >
          <FlaskConical className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          title={t('credential.delete')}
          disabled={remove.isPending}
          onClick={() => setShowConfirm(true)}
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
  const [oauthLoading, setOauthLoading] = useState(false);
  const toast = useToast();

  const create = useMutation({
    mutationFn: () =>
      api.post('/credentials', { label, connector, data: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast(t('credential.added'), 'success');
      onClose();
    },
    onError: () => toast(t('common.error'), 'error'),
  });

  const handleField = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleGmailOAuth = async () => {
    setOauthLoading(true);
    try {
      const { data } = await api.get('/auth/gmail/init');
      window.location.href = data.url;
    } catch {
      toast(t('common.error'), 'error');
      setOauthLoading(false);
    }
  };

  const isGmail = connector === 'gmail';

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) p-6 mb-6">
      <h3 className="text-sm font-semibold mb-4">{t('credential.new')}</h3>

      <div className="flex flex-col gap-4 max-w-md">
        {/* Sélecteur de connecteur */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('credential.connector')}</label>
          <select
            value={connector}
            onChange={(e) => { setConnector(e.target.value); setFields({}); setLabel(''); }}
            className="h-10 w-full rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-sm text-(--color-foreground) outline-none focus:border-(--color-foreground) transition-colors"
          >
            {CONNECTORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {isGmail ? (
          /* Gmail — bouton OAuth à la place des champs manuels */
          <div className="flex flex-col gap-3">
            <p className="text-sm text-(--color-muted-foreground)">{t('credential.gmailOAuthHint')}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={oauthLoading}
                onClick={handleGmailOAuth}
                className="gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {oauthLoading ? t('common.loading') : t('credential.connectGoogle')}
              </Button>
              <Button variant="ghost" type="button" onClick={onClose}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          /* Autres connecteurs — champs manuels */
          <>
            <Input
              id="cred-label"
              label={t('credential.label')}
              placeholder="Mon compte Discord"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />

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
          </>
        )}
      </div>
    </div>
  );
}
