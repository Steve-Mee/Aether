import { Clock } from 'lucide-react';
import React from 'react';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui';
import type { DemoIntentId } from '@/lib/localIntentMatcher';
import { getExplainTimeline, intentLabel } from '@/lib/localIntentMatcher';

interface DemoExplainSheetProps {
  open: boolean;
  intentId: DemoIntentId;
  onClose: () => void;
}

export default function DemoExplainSheet({ open, intentId, onClose }: DemoExplainSheetProps) {
  const steps = getExplainTimeline(intentId);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0 border-l border-border/30 bg-card/95 backdrop-blur-md"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-border/20 px-6 py-5 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65">Uitleg</p>
          <SheetTitle id="demo-explain-title" className="text-base font-medium text-left">
            {intentLabel(intentId)}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="text-sm text-muted-foreground/80 mb-6 leading-relaxed">
            AETHER heeft deze actie voorbereid op basis van recente data en je huidige beleid.
          </p>
          <ol className="space-y-5">
            {steps.map((step, index) => (
              <li key={`${step.at}-${step.label}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                    <Clock size={14} aria-hidden />
                  </span>
                  {index < steps.length - 1 && (
                    <span className="mt-2 w-px flex-1 min-h-[24px] bg-border/30" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[10px] tabular-nums text-muted-foreground/65">{step.at}</p>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  {step.detail && (
                    <p className="mt-1 text-sm text-muted-foreground/80 leading-relaxed">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border/20 px-6 py-4">
          <Button
            type="button"
            variant="premium"
            className="w-full h-10 rounded-lg"
            onClick={onClose}
          >
            Sluiten
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
