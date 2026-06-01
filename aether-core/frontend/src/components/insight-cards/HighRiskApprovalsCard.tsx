import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/shadcn/button';
import { ConfidenceHero } from '@/components/command-center/primitives';
import InsightCardBase from './InsightCardBase';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Bulkprijs · 23 SKU', risk: 'Hoog' },
  { label: 'Mail escalatie', risk: 'Kritiek' },
] as const;

export default function HighRiskApprovalsCard() {
  return (
    <InsightCardBase
      eyebrow="Goedkeuringen"
      title="4 high-risk"
      icon={<ShieldAlert size={16} strokeWidth={1.75} />}
      accent="danger"
      footer={
        <Button size="sm" variant="destructive" className="h-9 w-full sm:w-auto rounded-lg" asChild>
          <Link to="/approvals">Open</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <ConfidenceHero value="4" label="Wachten" />
        <ul className="space-y-2 border-t border-border/20 pt-3">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
            >
              <span className="truncate">{item.label}</span>
              <span
                className={cn(
                  'shrink-0 text-[10px] font-medium uppercase tracking-wide',
                  item.risk === 'Kritiek' ? 'text-destructive/90' : 'text-muted-foreground'
                )}
              >
                {item.risk}
              </span>
            </li>
          ))}
          <li className="text-[11px] text-muted-foreground/60">+2 meer</li>
        </ul>
      </div>
    </InsightCardBase>
  );
}
