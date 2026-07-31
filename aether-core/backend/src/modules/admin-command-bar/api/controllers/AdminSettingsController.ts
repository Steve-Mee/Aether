import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import {
  getTenantApprovalPolicy,
  setTenantApprovalPolicy,
  type TenantApprovalPolicy,
} from '../../../../shared/policy/tenantApprovalPolicyService';
import {
  getMerchantSettings,
  updateMerchantSettings,
  listConnectedServices,
} from '../../../../shared/settings/TenantSettingsService';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';
import { assessAutonomyWithTraceForTenant } from '../../../../shared/policy/AutonomyPolicyService';
import {
  autonomySimulateSchema,
  createGoalSchema,
  policyPatchSchema,
  settingsPatchSchema,
  updateGoalSchema,
} from '../schemas/adminSchemas';

const APPROVAL_POLICY_SUNSET = '2026-12-31';

export class AdminSettingsController {
  getApprovalPolicy = [
    requireViewer,
    async (req: Request, res: Response) => {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', APPROVAL_POLICY_SUNSET);
      res.setHeader('Link', '</api/admin/settings>; rel="successor-version"');
      const policy = await getTenantApprovalPolicy(req.tenantId!);
      res.json({ status: 'live', policy, deprecated: true, useSettings: '/api/admin/settings' });
    },
  ];

  updateApprovalPolicy = [
    requireOperator,
    validateBody(policyPatchSchema),
    async (req: Request, res: Response) => {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', APPROVAL_POLICY_SUNSET);
      res.setHeader('Link', '</api/admin/settings>; rel="successor-version"');
      const policy = await setTenantApprovalPolicy(req.tenantId!, req.body as Partial<TenantApprovalPolicy>);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'approval_policy_updated',
        actor: req.actorId,
        details: { ...policy },
      });
      res.json({ success: true, policy, deprecated: true, useSettings: '/api/admin/settings' });
    },
  ];

  simulateAutonomy = [
    requireViewer,
    validateBody(autonomySimulateSchema),
    async (req: Request, res: Response) => {
      const body = req.body as z.infer<typeof autonomySimulateSchema>;
      const settings = await getMerchantSettings(req.tenantId!);
      const now = body.simulateAt ? new Date(body.simulateAt) : new Date();
      const result = await assessAutonomyWithTraceForTenant({
        tenantId: req.tenantId!,
        module: body.module,
        actionType: body.actionType,
        tool: body.tool,
        intent: body.intent,
        agentKey: body.agentKey,
        payload: body.payload,
        riskClass: body.riskClass,
        now,
        getSettings: getMerchantSettings,
      });
      res.json({
        assessment: {
          executionMode: result.executionMode,
          eligible: result.eligible,
          reason: result.reason,
          reasonCode: result.reasonCode,
          riskClass: result.riskClass,
          category: result.category,
        },
        trace: result.trace,
        matchedRuleId: result.matchedRuleId,
        settingsSnapshot: {
          preset: settings.autonomyPrefs.preset,
          autonomyLevel: settings.autonomyLevel,
          policyEnabled: settings.policyEnabled,
        },
      });
    },
  ];

  getSettings = [
    requireViewer,
    async (req: Request, res: Response) => {
      const settings = await getMerchantSettings(req.tenantId!);
      res.json({ status: 'live', settings });
    },
  ];

  updateSettings = [
    requireOperator,
    validateBody(settingsPatchSchema),
    async (req: Request, res: Response) => {
      const patch = req.body as Partial<MerchantSettings>;
      const settings = await updateMerchantSettings(req.tenantId!, patch);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'settings_updated',
        actor: req.actorId,
        details: patch,
      });
      res.json({ success: true, settings });
    },
  ];

  getConnectedServices = [
    requireViewer,
    async (req: Request, res: Response) => {
      const services = await listConnectedServices(req.tenantId!);
      res.json({ status: 'live', services });
    },
  ];

  listGoals = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const includeCompleted = req.query.includeCompleted === 'true';
      const goals = await goalService.listGoals(req.tenantId!, includeCompleted);
      res.json({ goals });
    },
  ];

  getGoal = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const detail = await goalService.getGoalWithSnapshots(req.tenantId!, req.params.id);
      if (!detail) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json(detail);
    },
  ];

  createGoal = [
    requireOperator,
    validateBody(createGoalSchema),
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      try {
        const goal = await goalService.createGoal(req.tenantId!, req.body);
        res.status(201).json({ goal });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Goal creation failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  updateGoal = [
    requireOperator,
    validateBody(updateGoalSchema),
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const goal = await goalService.updateGoal(req.tenantId!, req.params.id, req.body);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ goal });
    },
  ];

  deleteGoal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const ok = await goalService.deleteGoal(req.tenantId!, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ ok: true });
    },
  ];

  refreshGoal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const result = await goalService.refreshGoal(req.tenantId!, req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Goal not found or not active' });
        return;
      }
      res.json(result);
    },
  ];

  getGoalSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const goal = await goalService.getGoal(req.tenantId!, req.params.id);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const suggestions = await goalService.listLinkedSuggestions(req.tenantId!, req.params.id);
      res.json({ suggestions });
    },
  ];

  listAiGoalSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const suggestions = await goalService.listAiSuggestions(req.tenantId!);
      res.json({ suggestions });
    },
  ];

  acceptAiGoalSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      try {
        const goal = await goalService.acceptAiSuggestion(req.tenantId!, req.params.id);
        res.status(201).json({ goal });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Accept failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  dismissAiGoalSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      await goalService.dismissAiSuggestion(req.tenantId!, req.params.id);
      res.json({ ok: true });
    },
  ];

  getGoalConflicts = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const analysis = await goalService.getConflictAnalysis(req.tenantId!);
      res.json(analysis);
    },
  ];

  buildGoalPlan = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const plan = await goalService.buildPlan(req.tenantId!);
      if (!plan) {
        res.status(404).json({ error: 'No active goals or planning disabled' });
        return;
      }
      res.json({ plan });
    },
  ];

  getActiveGoalPlan = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const plan = await goalService.getActivePlan(req.tenantId!);
      res.json({ plan });
    },
  ];
}
