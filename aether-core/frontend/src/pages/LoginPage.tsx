import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import AetherBrandMark from '@/components/shell/AetherBrandMark';
import { env } from '@/lib/config';
import { DEMO_PERSONAS, getDefaultSignInEmail } from '@/lib/auth/adapters/stubAuthAdapter';
import { useAuth } from '@/lib/auth/AuthProvider';
import { t } from '@/lib/i18n';
import { cn, focusRing } from '@/lib/utils';

export default function LoginPage() {
  const { signIn, authError, loading } = useAuth();
  const location = useLocation();
  const isJwt = env.authProvider === 'jwt';
  const [email, setEmail] = useState(isJwt ? 'admin@aether.local' : getDefaultSignInEmail());
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(isJwt ? { email, password } : { email });
    } finally {
      setSubmitting(false);
    }
  }

  const busy = loading || submitting;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12"
      data-testid="login-page"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <AetherBrandMark size="md" className="mb-4" />
          <h1 className="text-headline font-semibold tracking-tight text-foreground">
            {t('auth.login.title')}
          </h1>
          <p className="text-meta text-muted-foreground mt-2">
            {isJwt ? t('auth.login.jwtSubtitle') : t('auth.login.subtitle')}
          </p>
          {fromPath && (
            <p className="text-caption text-muted-foreground mt-3">{t('auth.login.returnHint')}</p>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-6 shadow-sm space-y-5"
        >
          {isJwt ? (
            <fieldset className="space-y-4" disabled={busy}>
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                  {t('auth.login.emailLabel')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email"
                  className={cn(
                    'w-full rounded-lg border border-border/40 bg-background px-3 py-2.5 text-sm',
                    focusRing(),
                  )}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                  {t('auth.login.password')}
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="login-password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  className={cn(
                    'w-full rounded-lg border border-border/40 bg-background px-3 py-2.5 text-sm',
                    focusRing(),
                  )}
                />
              </div>
            </fieldset>
          ) : (
            <fieldset className="space-y-2" disabled={busy}>
              <legend className="text-sm font-medium text-foreground">
                {t('auth.login.personaLabel')}
              </legend>
              <div className="grid gap-2">
                {DEMO_PERSONAS.map((persona) => (
                  <label
                    key={persona.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors',
                      email === persona.email
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/40 hover:border-border/60 hover:bg-muted/20',
                      focusRing(),
                    )}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.email}
                      checked={email === persona.email}
                      onChange={() => setEmail(persona.email)}
                      className="sr-only"
                    />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 text-sm font-medium text-foreground shrink-0">
                      {persona.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-foreground">
                        {persona.name}
                      </span>
                      <span className="block text-caption text-muted-foreground truncate">
                        {persona.email} · {t(`userMenu.role.${persona.role}`)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {authError && (
            <p className="text-sm text-destructive" role="alert">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5',
              'text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
              'disabled:opacity-60 disabled:pointer-events-none',
              focusRing(),
            )}
          >
            {busy ? (
              <Spinner
                size="sm"
                className="text-primary-foreground [&_svg]:text-primary-foreground"
              />
            ) : null}
            {t('auth.login.submit')}
          </button>
        </form>

        <p className="text-caption text-caption-accessible text-center mt-6">
          {isJwt ? t('auth.login.jwtHint') : t('auth.login.stubHint')}
        </p>
      </div>
    </div>
  );
}
