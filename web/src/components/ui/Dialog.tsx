import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface DialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function Dialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onClose,
}: DialogProps) {
  const { t } = useTranslation();

  const confirm = confirmLabel ?? t('common.confirm');
  const cancel = cancelLabel ?? t('common.cancel');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-sm rounded-2xl border border-(--color-border) bg-(--color-card) p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold text-(--color-foreground) leading-snug">{title}</h2>
          <button onClick={onClose} className="text-(--color-muted-foreground) hover:text-(--color-foreground) transition-colors shrink-0 -mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-(--color-muted-foreground) mb-6">{description}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancel}
          </Button>
          <Button
            size="sm"
            onClick={() => { onConfirm(); onClose(); }}
            className={destructive ? 'bg-(--color-destructive) text-white hover:opacity-90' : ''}
          >
            {confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
