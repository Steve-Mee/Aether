import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import React from 'react';
import { t } from '@/lib/i18n';
import type { HomeLandingViewModel } from '@/lib/buildHomeLandingViewModel';
import { SectionLabel } from '@/components/command-center/primitives';
import { cn, interactiveSurface } from '@/lib/utils';

interface HomeTodaySummaryProps {
  viewModel: HomeLandingViewModel;
}

export default function HomeTodaySummary({ viewModel }: HomeTodaySummaryProps) {
  return (
    <section
      className="space-y-4"
      aria-labelledby="home-summary-heading"
      data-testid="home-today-summary"
    >
      <SectionLabel
        id="home-summary-heading"
        title={t('home.summary.title')}
        subtitle={t('home.summary.subtitle')}
      />

      {viewModel.showCalmFallback ? (
        <p
          className="text-body text-muted-foreground leading-relaxed pl-1"
          data-testid="home-summary-fallback"
        >
          {t('home.summary.calmFallback')}
        </p>
      ) : (
        <ul className="space-y-3" data-testid="home-summary-bullets">
          {viewModel.summaryBullets.map((bullet) => {
            const text = t(bullet.labelKey).replace('{count}', String(bullet.count));
            const content = (
              <>
                <Sparkles
                  size={14}
                  strokeWidth={1.75}
                  className="text-primary/50 shrink-0 mt-0.5"
                  aria-hidden
                />
                <span className="text-body text-foreground/90 leading-snug">{text}</span>
              </>
            );

            if (bullet.href) {
              return (
                <li key={bullet.id}>
                  <Link
                    to={bullet.href}
                    className={cn(
                      'flex items-start gap-3 rounded-xl px-3 py-2.5 -mx-3',
                      interactiveSurface('hover:bg-muted/15'),
                    )}
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={bullet.id} className="flex items-start gap-3 px-3 py-0.5">
                {content}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
