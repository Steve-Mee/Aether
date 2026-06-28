import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui';
import { t, formatDate } from '@/lib/i18n';
import { SectionLabel } from '@/components/command-center/primitives';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn, interactiveSurface } from '@/lib/utils';
import type { ActivityFeedSource } from '@/lib/mergeActivityFeed';
import type { ActivityItem } from '@/types/activity';

interface HomeActivityPreviewProps {
  items: ActivityItem[];
  feedSource?: ActivityFeedSource;
}

function statusVariant(item: ActivityItem): 'default' | 'success' | 'warning' {
  if (item.status === 'autonomous') return 'success';
  if (item.status === 'pending' || item.risk === 'high') return 'warning';
  return 'default';
}

export default function HomeActivityPreview({ items, feedSource }: HomeActivityPreviewProps) {
  const navigate = useNavigate();

  return (
    <section
      className="space-y-4 pt-2"
      aria-labelledby="home-activity-heading"
      data-testid="home-activity-preview"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionLabel id="home-activity-heading" title={t('home.activity.title')} />
          {feedSource === 'hybrid' && (
            <p className="text-caption text-caption-accessible mt-1 pl-0.5">
              {t('home.activity.hybridHint')}
            </p>
          )}
        </div>
        <Link
          to={moduleLinks.activity}
          className="text-caption text-primary/90 hover:underline shrink-0 mb-1 flex items-center gap-0.5"
          data-testid="home-activity-view-all"
        >
          {t('home.activity.viewAll')}
          <ChevronRight size={14} />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-body text-muted-foreground pl-1" data-testid="home-activity-empty">
          {t('home.activity.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const at = new Date(item.at);
            const timeStr = at.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(moduleLinks.activity, { state: { selectedId: item.id } })}
                  className={cn(
                    'w-full text-left rounded-xl border border-border/30 bg-card/30 px-4 py-3',
                    interactiveSurface('hover:bg-card/55 hover:border-border/45'),
                  )}
                  data-testid={`home-activity-row-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-meta text-caption-accessible uppercase tracking-wide text-[10px]">
                        {timeStr} · {item.actionLabel}
                      </p>
                      <p className="text-body font-medium text-foreground/95 leading-snug mt-0.5 truncate">
                        {item.description}
                      </p>
                    </div>
                    <Badge variant={statusVariant(item)} className="shrink-0 text-[10px]">
                      {t(`activity.status.${item.status}`)}
                    </Badge>
                  </div>
                  <p className="text-caption text-muted-foreground mt-1.5">
                    {t(`activity.executor.${item.executor}`)} · {formatDate(item.at)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
