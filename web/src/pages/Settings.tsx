import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { User, Lock, Palette, Globe } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import api from '@/api/client';

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-(--color-border)">
        <Icon className="h-4 w-4 text-(--color-muted-foreground)" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const email = localStorage.getItem('userEmail') ?? '';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast(t('settings.passwordMismatch'), 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast(t('settings.passwordTooShort'), 'error');
      return;
    }
    setPwdLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      toast(t('settings.passwordUpdated'), 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast(t('settings.passwordIncorrect'), 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  const toggleLang = (lang: 'fr' | 'en') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <Layout title={t('nav.settings')}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h2>
        <p className="text-sm text-(--color-muted-foreground) mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-5 max-w-xl mx-auto">

        {/* Profil */}
        <Section title={t('settings.profile')} icon={User}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-muted) text-lg font-semibold text-(--color-foreground) shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{email.split('@')[0]}</p>
              <p className="text-xs text-(--color-muted-foreground)">{email}</p>
            </div>
          </div>
        </Section>

        {/* Sécurité */}
        <Section title={t('settings.security')} icon={Lock}>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <Input
              id="current-password"
              type="password"
              label={t('settings.currentPassword')}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              id="new-password"
              type="password"
              label={t('settings.newPassword')}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              id="confirm-password"
              type="password"
              label={t('settings.confirmPassword')}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="pt-1">
              <Button type="submit" size="sm" disabled={pwdLoading}>
                {pwdLoading ? t('common.loading') : t('settings.updatePassword')}
              </Button>
            </div>
          </form>
        </Section>

        {/* Apparence */}
        <Section title={t('settings.appearance')} icon={Palette}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-(--color-muted-foreground)">{t('settings.theme')}</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((themeKey) => (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                    theme === themeKey
                      ? 'border-(--color-foreground) bg-(--color-foreground) text-(--color-background)'
                      : 'border-(--color-border) text-(--color-muted-foreground) hover:border-(--color-foreground) hover:text-(--color-foreground)'
                  }`}
                >
                  {themeKey === 'light' ? t('settings.themeLight') : themeKey === 'dark' ? t('settings.themeDark') : t('settings.themeSystem')}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Langue */}
        <Section title={t('settings.language')} icon={Globe}>
          <div className="flex gap-2">
            {(['fr', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                  i18n.language === lang
                    ? 'border-(--color-foreground) bg-(--color-foreground) text-(--color-background)'
                    : 'border-(--color-border) text-(--color-muted-foreground) hover:border-(--color-foreground) hover:text-(--color-foreground)'
                }`}
              >
                {lang === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
        </Section>

      </div>
    </Layout>
  );
}
