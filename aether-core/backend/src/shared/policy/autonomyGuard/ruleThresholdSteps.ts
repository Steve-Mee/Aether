import { matchAutonomyRules } from '../AutonomyRuleEngine';
import type { AutonomyGuardStep } from './types';
import { done, pushTrace } from './helpers';

export const customRuleStep: AutonomyGuardStep = {
  name: 'custom_rule',
  run(ctx) {
    const matchedRule = matchAutonomyRules(ctx.settings.autonomyPrefs?.customRules ?? [], {
      marginImpactEuro: ctx.marginImpact,
      priceChangePct: ctx.pct,
      category: ctx.category,
      riskClass: ctx.riskClass,
      agentKey: ctx.input.agentKey,
      now: ctx.now,
    });

    if (matchedRule) {
      pushTrace(
        ctx.trace,
        'custom_rule',
        true,
        `Regel "${matchedRule.rule.name}" (${matchedRule.outcome})`,
        matchedRule.outcome === 'allow_auto'
          ? 'custom_rule_allow'
          : matchedRule.outcome === 'block'
            ? 'custom_rule_block'
            : 'custom_rule_deferred'
      );
      if (matchedRule.outcome === 'allow_auto') {
        return done(
          ctx,
          {
            executionMode: 'autonomous',
            eligible: true,
            reason: `Custom regel: ${matchedRule.rule.name}`,
            reasonCode: 'custom_rule_allow',
            riskClass: ctx.riskClass,
            category: ctx.category,
          },
          matchedRule.rule.id
        );
      }
      if (matchedRule.outcome === 'block') {
        return done(
          ctx,
          {
            executionMode: 'blocked',
            eligible: false,
            reason: `Custom regel blokkeert: ${matchedRule.rule.name}`,
            reasonCode: 'custom_rule_block',
            riskClass: ctx.riskClass,
            category: ctx.category,
          },
          matchedRule.rule.id
        );
      }
      return done(
        ctx,
        {
          executionMode: 'approval_required',
          eligible: false,
          reason: `Custom regel vereist goedkeuring: ${matchedRule.rule.name}`,
          reasonCode: 'custom_rule_deferred',
          riskClass: ctx.riskClass,
          category: ctx.category,
        },
        matchedRule.rule.id
      );
    }
    pushTrace(ctx.trace, 'custom_rule', true, 'Geen regel van toepassing');
    return { kind: 'continue' };
  },
};

export const marginThresholdStep: AutonomyGuardStep = {
  name: 'margin_threshold',
  run(ctx) {
    if (ctx.marginImpact > ctx.settings.maxMarginImpactEuro) {
      pushTrace(
        ctx.trace,
        'margin_threshold',
        false,
        `€${ctx.marginImpact} > €${ctx.settings.maxMarginImpactEuro}`,
        'margin_exceeded'
      );
      return done(ctx, {
        executionMode: 'approval_required',
        eligible: false,
        reason: `Marge-impact €${ctx.marginImpact} boven drempel €${ctx.settings.maxMarginImpactEuro}`,
        reasonCode: 'margin_exceeded',
        riskClass: 'high',
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'margin_threshold', true);
    return { kind: 'continue' };
  },
};

export const pricePctThresholdStep: AutonomyGuardStep = {
  name: 'price_pct_threshold',
  run(ctx) {
    if (/price|prijs/.test(ctx.actionType) && ctx.pct > 0 && ctx.pct > ctx.settings.maxAutoPriceChangePct) {
      pushTrace(
        ctx.trace,
        'price_pct_threshold',
        false,
        `${ctx.pct}% > ${ctx.settings.maxAutoPriceChangePct}%`,
        'price_pct_exceeded'
      );
      return done(ctx, {
        executionMode: 'approval_required',
        eligible: false,
        reason: `Prijswijziging ${ctx.pct}% boven drempel ${ctx.settings.maxAutoPriceChangePct}%`,
        reasonCode: 'price_pct_exceeded',
        riskClass: 'medium',
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'price_pct_threshold', true);
    return { kind: 'continue' };
  },
};

export const autonomyLevelStep: AutonomyGuardStep = {
  name: 'autonomy_level',
  run(ctx) {
    if (ctx.settings.autonomyLevel === 'low' && ctx.riskClass !== 'low') {
      pushTrace(ctx.trace, 'autonomy_level', false, 'Niveau laag', 'autonomy_level_low');
      return done(ctx, {
        executionMode: 'approval_required',
        eligible: false,
        reason: 'Autonomie niveau laag — goedkeuring vereist',
        reasonCode: 'autonomy_level_low',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'autonomy_level', true);
    return { kind: 'continue' };
  },
};
