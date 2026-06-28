import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto pt-16">
      <EmptyState
        title={t('error.notFound.title')}
        description={t('error.notFound.description')}
        action={
          <Link
            to="/command-center"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('error.notFound.action')}
          </Link>
        }
      />
    </div>
  );
}
