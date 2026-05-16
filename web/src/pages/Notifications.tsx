import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCheck } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  runId: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.runId) navigate(`/runs/${n.runId}`);
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Layout title={t('notifications.title')}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('notifications.title')}</h2>
          <p className="text-sm text-(--color-muted-foreground) mt-1">
            {unreadCount > 0
              ? t('notifications.unreadCount', { count: unreadCount })
              : t('notifications.allRead')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-(--color-muted-foreground) text-sm">
          {t('common.loading')}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border border-(--color-border) bg-(--color-card) divide-y divide-(--color-border)">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n)} />
          ))}
        </div>
      )}
    </Layout>
  );
}

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-(--color-muted) ${
        !n.read ? 'bg-(--color-muted)/40' : ''
      }`}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-destructive)/10">
        <AlertTriangle className="h-4 w-4 text-(--color-destructive)" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{n.title}</p>
          {!n.read && <Badge variant="destructive" className="shrink-0">{t('notifications.new')}</Badge>}
        </div>
        <p className="text-xs text-(--color-muted-foreground) mt-0.5">{n.message}</p>
        <p className="text-xs text-(--color-muted-foreground) mt-1">
          {new Date(n.createdAt).toLocaleString()}
        </p>
      </div>
    </button>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--color-muted)">
        <Bell className="h-6 w-6 text-(--color-muted-foreground)" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t('notifications.empty')}</p>
        <p className="text-sm text-(--color-muted-foreground) mt-1">{t('notifications.emptySubtitle')}</p>
      </div>
    </div>
  );
}
