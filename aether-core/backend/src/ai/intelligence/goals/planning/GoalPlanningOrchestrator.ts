import { prisma } from '../../../../shared/prisma/client';
import type { PlanNode } from '../../multi-agent/types';
import { GoalRepository } from '../GoalRepository';
import { GoalToPlanNodeBuilder } from './GoalToPlanNodeBuilder';
import { isGoalPlanningGraphEnabled } from '../goalConfig';

const PLAN_NAMESPACE = 'workflow_supervisor';
const PLAN_KEY = 'subPlan';

export interface GoalPlanState {
  goalIds: string[];
  planNode: PlanNode;
  createdAt: string;
  status: 'draft' | 'executing' | 'completed';
}

export class GoalPlanningOrchestrator {
  constructor(
    private repository: GoalRepository,
    private planBuilder: GoalToPlanNodeBuilder = new GoalToPlanNodeBuilder()
  ) {}

  async buildPlan(tenantId: string): Promise<GoalPlanState | null> {
    if (!isGoalPlanningGraphEnabled()) return null;
    const goals = await this.repository.listActiveForProgress(tenantId);
    if (goals.length === 0) return null;

    const planNode = this.planBuilder.build(goals);
    const state: GoalPlanState = {
      goalIds: goals.map((g) => g.id),
      planNode,
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
    await this.persistPlan(tenantId, state);
    return state;
  }

  async getActivePlan(tenantId: string): Promise<GoalPlanState | null> {
    const row = await prisma.merchantSharedMemory.findUnique({
      where: {
        tenantId_namespace_key: { tenantId, namespace: PLAN_NAMESPACE, key: PLAN_KEY },
      },
    });
    if (!row?.value || typeof row.value !== 'object') return null;
    return row.value as unknown as GoalPlanState;
  }

  private async persistPlan(tenantId: string, state: GoalPlanState): Promise<void> {
    await prisma.merchantSharedMemory.upsert({
      where: {
        tenantId_namespace_key: { tenantId, namespace: PLAN_NAMESPACE, key: PLAN_KEY },
      },
      create: {
        tenantId,
        namespace: PLAN_NAMESPACE,
        key: PLAN_KEY,
        value: state as object,
        updatedByAgentKey: 'workflow_supervisor',
      },
      update: {
        value: state as object,
        updatedByAgentKey: 'workflow_supervisor',
      },
    });
  }
}
