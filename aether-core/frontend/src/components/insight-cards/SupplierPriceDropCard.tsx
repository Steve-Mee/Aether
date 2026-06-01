import { RefreshCw, Truck } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/shadcn/button';
import { StatChip } from '@/components/command-center/primitives';
import InsightCardBase from './InsightCardBase';

export default function SupplierPriceDropCard() {
  return (
    <InsightCardBase
      eyebrow="Leverancier"
      title="Nordic · inkoop −6,8%"
      icon={<Truck size={16} strokeWidth={1.75} />}
      accent="default"
      footer={
        <>
          <Button size="sm" variant="default" className="h-9 gap-1.5 flex-1 sm:flex-none rounded-lg">
            <RefreshCw size={14} strokeWidth={1.75} />
            Sync
          </Button>
          <Button size="sm" variant="premium" className="h-9 flex-1 sm:flex-none rounded-lg">
            SKUs
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2.5 pt-0.5">
        <StatChip>12 SKU</StatChip>
        <StatChip>09:14</StatChip>
      </div>
    </InsightCardBase>
  );
}
