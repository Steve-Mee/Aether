import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import AetherBrandMark from '@/components/shell/AetherBrandMark';
import { useAuth } from '@/lib/auth/AuthProvider';
import { t } from '@/lib/i18n';

export default function OidcCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(errorParam === 'oidc_failed' ? t('auth.oidc.error') : errorParam);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (success === 'true') {
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('aether_access_token='))
          ?.split('=')[1];

        if (token) {
          document.cookie = 'aether_access_token=; max-age=0; path=/';
          localStorage.setItem('aether_access_token', token);
          await checkSession();
          navigate('/');
        } else {
          setError(t('auth.oidc.noToken'));
          setTimeout(() => navigate('/login'), 3000);
        }
      }
    };

    void handleCallback();
  }, [searchParams, navigate, checkSession]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md text-center">
        <AetherBrandMark size="md" className="mb-6 mx-auto" />
        {error ? (
          <div className="space-y-4">
            <h1 className="text-headline font-semibold tracking-tight text-foreground">
              {t('auth.oidc.callbackError')}
            </h1>
            <p className="text-body text-destructive">{error}</p>
            <p className="text-meta text-muted-foreground">{t('auth.oidc.redirecting')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-headline font-semibold tracking-tight text-foreground">
              {t('auth.oidc.completing')}
            </h1>
            <Spinner className="mx-auto" />
            <p className="text-meta text-muted-foreground">{t('auth.oidc.almostThere')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
