import { ShieldAlert } from 'lucide-react';
import React from 'react';
import { Button, RiskBadge, Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui';
import type { DemoCommandResponse } from '@/lib/localIntentMatcher';
import { intentLabel } from '@/lib/localIntentMatcher';
import { IntentPill, StatChip } from './primitives';

interface CommandCenterApprovalSheetProps {
  open: boolean;
  response: DemoCommandResponse | null;
  onConfirm: () => void;
  onAdjust: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function CommandCenterApprovalSheet({
  open,
  response,
  onConfirm,
  onAdjust,
  onReject,
  loading,
}: CommandCenterApprovalSheetProps) {
  if (!response) return null;

  const title = response.gateTitle ?? response.preparedHeadline;
  const summary = response.gateSummary ?? response.summary;
  const impact = response.gateImpact ?? response.impactValue;
  const riskBand = response.riskBand ?? 'high';

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onReject()}>
      <SheetContent
        side="right"
        data-testid="command-approval-sheet"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0 border-l border-border/30 bg-card/95 backdrop-blur-md"
        showClose={false}
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-border/20 px-6 py-5 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65">
            Goedkeuring nodig
          </p>
          <SheetTitle id="command-approval-title" className="text-base font-medium text-left">
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
            <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-foreground/90 leading-relaxed">{response.result}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65 mb-2">
              Wat er gebeurt
            </p>
            <p className="text-sm text-muted-foreground/85 leading-relaxed">{summary}</p>
          </div>

          {impact && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65 mb-2">
                Impact
              </p>
              <p className="text-sm font-medium text-foreground">{impact}</p>
              {response.gateRiskDetail && (
                <p className="mt-2 text-sm text-muted-foreground/75 leading-relaxed">
                  {response.gateRiskDetail}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/65">
                Risico
              </span>
              <RiskBadge band={riskBand} />
            </div>
            {typeof response.confidence === 'number' && response.confidence >= 0.5 && (
              <IntentPill label={intentLabel(response.intentId)} confidence={response.confidence} />
            )}
          </div>

          {response.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {response.highlights.map((line) => (
                <StatChip key={line}>{line}</StatChip>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/20 px-6 py-4 space-y-2">
          <Button
            type="button"
            className="w-full h-10 rounded-lg"
            onClick={onConfirm}
            disabled={loading}
          >
            Goedkeuren & uitvoeren
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="premium"
              className="flex-1 h-10 rounded-lg"
              onClick={onAdjust}
              disabled={loading}
            >
              Aanpassen
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1 h-10 rounded-lg text-muted-foreground"
              onClick={onReject}
              disabled={loading}
            >
              Weigeren
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
