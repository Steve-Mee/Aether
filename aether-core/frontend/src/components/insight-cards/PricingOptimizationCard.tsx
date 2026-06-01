import { TrendingUp } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/shadcn/button';
import { ConfidenceHero, MetricBlock } from '@/components/command-center/primitives';
import InsightCardBase from './InsightCardBase';

export default function PricingOptimizationCard() {
  return (
    <InsightCardBase
      eyebrow="Prijs"
      title="Earbuds Pro · +4,2%"
      icon={<TrendingUp size={16} strokeWidth={1.75} />}
      accent="success"
      footer={
        <>
          <Button size="sm" className="h-9 flex-1 sm:flex-none rounded-lg">
            Uitvoeren
          </Button>
          <Button size="sm" variant="premium" className="h-9 flex-1 sm:flex-none rounded-lg">
            Uitleg
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ConfidenceHero value="87%" />
        <MetricBlock label="Marge" value="+€1,2k" subValue="/ maand" size="lg" />
      </div>
    </InsightCardBase>
  );
}
