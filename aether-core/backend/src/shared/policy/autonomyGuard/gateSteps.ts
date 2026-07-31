import {
  isAutonomousWindowOpen,
} from '../../settings/merchantSettingsTypes';
import { isCategoryWindowOpen } from '../../settings/categoryWindow';
import type { AutonomyGuardStep } from './types';
import { done, pushTrace } from './helpers';

export const highRiskGuardStep: AutonomyGuardStep = {
  name: 'high_risk_guard',
  run(ctx) {
    if (ctx.riskClass === 'high' || ctx.decision.riskClass === 'high') {
      pushTrace(ctx.trace, 'high_risk_guard', false, 'Hoog risico — goedkeuring altijd vereist', 'high_risk_guard');
      return done(ctx, {
        executionMode: 'approval_required',
        eligible: false,
        reason: 'Hoog risico — goedkeuring altijd vereist',
        reasonCode: 'high_risk_guard',
        riskClass: 'high',
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'high_risk_guard', true);
    return { kind: 'continue' };
  },
};

export const policyEnabledStep: AutonomyGuardStep = {
  name: 'policy_enabled',
  run(ctx) {
    if (!ctx.settings.policyEnabled) {
      pushTrace(ctx.trace, 'policy_enabled', false, 'Auto-approve uitgeschakeld', 'policy_disabled');
      return done(ctx, {
        executionMode: 'approval_required',
        eligible: false,
        reason: 'Auto-approve uitgeschakeld',
        reasonCode: 'policy_disabled',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'policy_enabled', true);
    return { kind: 'continue' };
  },
};

export const categoryEnabledStep: AutonomyGuardStep = {
  name: 'category_enabled',
  run(ctx) {
    if (ctx.catPolicy && !ctx.catPolicy.enabled) {
      pushTrace(
        ctx.trace,
        'category_enabled',
        false,
        `Categorie ${ctx.category} is uitgeschakeld`,
        'category_disabled'
      );
      return done(ctx, {
        executionMode: 'blocked',
        eligible: false,
        reason: `Categorie ${ctx.category} is uitgeschakeld`,
        reasonCode: 'category_disabled',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'category_enabled', true);
    return { kind: 'continue' };
  },
};

export const agentEnabledStep: AutonomyGuardStep = {
  name: 'agent_enabled',
  run(ctx) {
    if (ctx.agentOv && !ctx.agentOv.enabled) {
      pushTrace(
        ctx.trace,
        'agent_enabled',
        false,
        `Agent ${ctx.input.agentKey} is uitgeschakeld`,
        'agent_disabled'
      );
      return done(ctx, {
        executionMode: 'blocked',
        eligible: false,
        reason: `Agent ${ctx.input.agentKey} is uitgeschakeld voor autonome acties`,
        reasonCode: 'agent_disabled',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(
      ctx.trace,
      'agent_enabled',
      true,
      ctx.agentOv ? `priority ${ctx.agentOv.priority}` : 'default'
    );
    return { kind: 'continue' };
  },
};

export const globalWindowStep: AutonomyGuardStep = {
  name: 'global_window',
  run(ctx) {
    if (!isAutonomousWindowOpen(ctx.settings, ctx.now)) {
      pushTrace(ctx.trace, 'global_window', false, 'Buiten auto-run venster', 'outside_window');
      return done(ctx, {
        executionMode: 'inform_only',
        eligible: false,
        reason: 'Buiten auto-run venster',
        reasonCode: 'outside_window',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'global_window', true);
    return { kind: 'continue' };
  },
};

export const categoryWindowStep: AutonomyGuardStep = {
  name: 'category_window',
  run(ctx) {
    if (ctx.category && !isCategoryWindowOpen(ctx.category, ctx.settings, ctx.now)) {
      pushTrace(
        ctx.trace,
        'category_window',
        false,
        `Categorie ${ctx.category} buiten schema`,
        'category_outside_window'
      );
      return done(ctx, {
        executionMode: 'inform_only',
        eligible: false,
        reason: `Categorie ${ctx.category} is buiten het ingestelde tijdvenster`,
        reasonCode: 'category_outside_window',
        riskClass: ctx.riskClass,
        category: ctx.category,
      });
    }
    pushTrace(ctx.trace, 'category_window', true, ctx.category ? 'continuous or open' : 'n/a');
    return { kind: 'continue' };
  },
};
