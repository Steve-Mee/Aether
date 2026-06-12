import React from 'react';
import { Mail, Package, CreditCard } from 'lucide-react';
import type { ConnectedService } from '@/lib/api';
import { useConnectedServicesQuery } from '@/features/settings/hooks/useConnectedServicesQuery';
import { t } from '@/lib/i18n';
import { showCalmToast } from '@/lib/toast';
import { AsyncBoundary, Badge, Button, Card } from '@/components/ui';
import { SettingsSectionSkeleton } from '@/components/ui/skeletons/SettingsSectionSkeleton';

const iconForType = {
  email: Mail,
  supplier: Package,
  payment: CreditCard,
};

function statusLabel(status: ConnectedService['status']): string {
  switch (status) {
    case 'connected':
      return t('settings.services.connected');
    case 'disconnected':
      return t('settings.services.disconnected');
    case 'demo':
      return t('settings.services.demo');
    default:
      return status;
  }
}

function statusVariant(status: ConnectedService['status']): 'default' | 'success' | 'warning' {
  if (status === 'connected') return 'success';
  if (status === 'demo') return 'warning';
  return 'default';
}

export default function ConnectedServicesSection() {
  const { data, loading, error, reload } = useConnectedServicesQuery();

  const handleConnect = (service: ConnectedService) => {
    showCalmToast({
      title: `${service.name}: ${t('settings.services.connectDemo')}`,
    });
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-services">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.services')}
      </h2>

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={reload}
        skeleton={<SettingsSectionSkeleton />}
      >
        <ul className="space-y-4">
          {data?.map((service) => {
            const Icon = iconForType[service.type];
            return (
              <li
                key={service.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-aether border border-border/30 bg-background/40"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-muted-foreground" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground truncate">{service.name}</p>
                    {service.detail && (
                      <p className="text-caption text-muted-foreground mt-0.5">{service.detail}</p>
                    )}
                    <p className="text-caption text-muted-foreground mt-1">
                      {t('settings.services.lastSync')}:{' '}
                      {service.lastSyncAt
                        ? new Date(service.lastSyncAt).toLocaleString()
                        : t('settings.services.never')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={statusVariant(service.status)}>
                    {statusLabel(service.status)}
                  </Badge>
                  {service.status !== 'connected' && (
                    <Button variant="secondary" size="sm" onClick={() => handleConnect(service)}>
                      {t('settings.services.connect')}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </AsyncBoundary>
    </Card>
  );
}
