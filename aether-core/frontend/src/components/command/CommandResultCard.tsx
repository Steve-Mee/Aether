import React from 'react';
import type { CommandResult } from '../../lib/CommandContext';
import Card from '../ui/Card';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import RiskBadge from '../ui/RiskBadge';
import { t } from '../../lib/i18n';

interface CommandResultCardProps {
  result: CommandResult;
}

function inferRisk(confidence: number, requiresApproval?: boolean): 'low' | 'medium' | 'high' {
  if (resultRequiresApproval(requiresApproval, confidence)) {
    return confidence >= 0.8 ? 'medium' : 'high';
  }
  return confidence >= 0.85 ? 'low' : confidence >= 0.6 ? 'medium' : 'high';
}

function resultRequiresApproval(requiresApproval?: boolean, confidence?: number): boolean {
  if (requiresApproval != null) return requiresApproval;
  return (confidence ?? 0) < 0.85;
}

export default function CommandResultCard({ result }: CommandResultCardProps) {
  const risk = result.riskBand ?? inferRisk(result.confidence, result.requiresApproval);

  return (
    <Card padding="sm" className="border-[var(--color-success)]/30">
      <p className="text-sm text-[var(--color-text)]">{result.result}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-[var(--color-text-subtle)]">{t('command.result.intent')}</dt>
          <dd className="text-[var(--color-text-muted)] font-mono">{result.parsedIntent}</dd>
        </div>
        {result.action && (
          <div>
            <dt className="text-[var(--color-text-subtle)]">{t('command.result.action')}</dt>
            <dd className="text-[var(--color-text-muted)] font-mono">{result.action}</dd>
          </div>
        )}
      </dl>
      <div className="flex items-center gap-3 mt-3">
        <ConfidenceBadge confidence={result.confidence} />
        <RiskBadge band={risk} />
      </div>
    </Card>
  );
}
