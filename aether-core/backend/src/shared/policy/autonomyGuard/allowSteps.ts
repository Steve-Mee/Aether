import type { AutonomyGuardStep } from './types';
import { done, pushTrace } from './helpers';

export const lowRiskAutoStep: AutonomyGuardStep = {
  name: 'low_risk_auto',
  run(ctx) {
    if (
      ctx.riskClass === 'low' &&
      ctx.settings.autoApproveLowRisk &&
      !ctx.decision.requiresApproval
    ) {
      if (!ctx.effective.allowLow) {
        const code =
          ctx.agentOv?.allowLowRiskAutoExecute === false
            ? 'agent_low_risk_denied'
            : 'category_low_risk_denied';
        pushTrace(ctx.trace, 'low_risk_auto', false, 'Low-risk auto-execute niet toegestaan', code);
        return done(ctx, {
          executionMode: 'approval_required',
          eligible: false,
          reason:
            code === 'agent_low_risk_denied'
              ? `Agent ${ctx.input.agentKey} staat geen low-risk auto-execute toe`
              : `Categorie ${ctx.category} staat geen low-risk auto-execute toe`,
          reasonCode: code,
          riskClass: ctx.riskClass,
          category: ctx.category,
        });
      }
      pushTrace(ctx.trace, 'low_risk_auto', true);
      return done(ctx, {
        executionMode: 'autonomous',
        eligible: true,
        reason: 'Laag risico — policy staat auto-goedkeuring toe',
        reasonCode: 'low_risk_allowed',
        riskClass: 'low',
        category: ctx.category,
      });
    }
    return { kind: 'continue' };
  },
};

export const mailMediumOverrideStep: AutonomyGuardStep = {
  name: 'mail_medium_override',
  run(ctx) {
    if (
      ctx.module === 'aether-mail' &&
      ctx.riskClass === 'medium' &&
      ctx.settings.autoApproveMediumRiskMail
    ) {
      pushTrace(ctx.trace, 'mail_medium_override', true);
      return done(ctx, {
        executionMode: 'autonomous',
        eligible: true,
        reason: 'Mail medium-risico — policy override',
        reasonCode: 'mail_medium_override',
        riskClass: 'medium',
        category: ctx.category,
      });
    }
    return { kind: 'continue' };
  },
};

export const priceWithinThresholdStep: AutonomyGuardStep = {
  name: 'price_within_threshold',
  run(ctx) {
    if (
      /price|prijs/.test(ctx.actionType) &&
      ctx.pct > 0 &&
      ctx.pct <= ctx.settings.maxAutoPriceChangePct &&
      ctx.settings.autoApproveLowRisk
    ) {
      if (!ctx.effective.allowLow && !ctx.effective.allowMedium) {
        pushTrace(
          ctx.trace,
          'category_medium_auto',
          false,
          'Prijs categorie medium denied',
          'category_medium_risk_denied'
        );
        return done(ctx, {
          executionMode: 'approval_required',
          eligible: false,
          reason: `Prijsaanpassingen vereisen goedkeuring (categorie ${ctx.category})`,
          reasonCode: 'category_medium_risk_denied',
          riskClass: 'medium',
          category: ctx.category,
        });
      }
      pushTrace(ctx.trace, 'price_within_threshold', true);
      return done(ctx, {
        executionMode: 'autonomous',
        eligible: true,
        reason: `Prijs ≤${ctx.settings.maxAutoPriceChangePct}% — binnen drempel`,
        reasonCode: 'price_within_threshold',
        riskClass: 'medium',
        category: ctx.category,
      });
    }
    return { kind: 'continue' };
  },
};

export const highAutonomyMediumStep: AutonomyGuardStep = {
  name: 'high_autonomy_medium',
  run(ctx) {
    if (
      ctx.settings.autonomyLevel === 'high' &&
      ctx.riskClass === 'medium' &&
      ctx.settings.autoApproveLowRisk &&
      !ctx.decision.requiresApproval
    ) {
      if (!ctx.effective.allowMedium && !ctx.effective.allowLow) {
        pushTrace(ctx.trace, 'category_medium_auto', false, 'Medium niet toegestaan', 'category_medium_risk_denied');
        return done(ctx, {
          executionMode: 'approval_required',
          eligible: false,
          reason: `Medium-risico niet toegestaan voor categorie ${ctx.category}`,
          reasonCode: 'category_medium_risk_denied',
          riskClass: 'medium',
          category: ctx.category,
        });
      }
      pushTrace(ctx.trace, 'high_autonomy_medium', true);
      return done(ctx, {
        executionMode: 'autonomous',
        eligible: true,
        reason: 'Hoog autonomie niveau — medium-risico toegestaan',
        reasonCode: 'high_autonomy_medium',
        riskClass: 'medium',
        category: ctx.category,
      });
    }
    return { kind: 'continue' };
  },
};

export const defaultDenyStep: AutonomyGuardStep = {
  name: 'default',
  run(ctx) {
    pushTrace(ctx.trace, 'default', false, ctx.decision.reason, 'default_denied');
    return done(ctx, {
      executionMode: ctx.decision.requiresApproval ? 'approval_required' : 'inform_only',
      eligible: false,
      reason: ctx.decision.reason,
      reasonCode: 'default_denied',
      riskClass: ctx.riskClass,
      category: ctx.category,
    });
  },
};
