import { Request, Response } from 'express';
import { z } from 'zod';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import {
  FederatedDeploymentRegistry,
} from '../../../../ai/intelligence/multi-agent/peer/federated/FederatedDeploymentRegistry';
import {
  getFederatedDeploymentId,
  getMessageBrokerType,
  isFederatedRpcEnabled,
} from '../../../../shared/messaging/messagingConfig';
import {
  getOutboxRelayBacklogCount,
  getUnprocessedEventCount,
} from '../../../../shared/messaging/messagingMetrics';
import { FEDERATED_CAPABILITY_CATALOG } from '../../../../ai/intelligence/multi-agent/peer/federated/federatedCapabilities';

const registry = new FederatedDeploymentRegistry();

const deploymentSchema = z.object({
  deploymentId: z.string().min(1).max(100),
  baseUrl: z.string().url().optional(),
  publicKey: z.string().max(2000).optional(),
  capabilities: z.array(z.string().min(1).max(100)).min(1),
  status: z.enum(['active', 'inactive']).optional(),
});

export class FederatedDeploymentsController {
  list = [
    requireViewer,
    async (_req: Request, res: Response) => {
      const deployments = await registry.listAll();
      res.json({ deployments, capabilityCatalog: FEDERATED_CAPABILITY_CATALOG });
    },
  ];

  status = [
    requireViewer,
    async (_req: Request, res: Response) => {
      const [relayBacklog, unprocessedEvents] = await Promise.all([
        getOutboxRelayBacklogCount(),
        getUnprocessedEventCount(),
      ]);
      res.json({
        localDeploymentId: getFederatedDeploymentId(),
        federatedRpcEnabled: isFederatedRpcEnabled(),
        messageBroker: getMessageBrokerType(),
        relayBacklog,
        unprocessedEvents,
      });
    },
  ];

  create = [
    requireOperator,
    validateBody(deploymentSchema),
    async (req: Request, res: Response) => {
      const body = req.body as z.infer<typeof deploymentSchema>;
      await registry.upsert({
        deploymentId: body.deploymentId,
        baseUrl: body.baseUrl,
        publicKey: body.publicKey,
        capabilities: body.capabilities,
        status: body.status ?? 'active',
      });
      await writeAuditLog({
        tenantId: req.tenantId!,
        actor: req.actorId ?? 'system',
        module: 'federated',
        action: 'deployment.create',
        details: { deploymentId: body.deploymentId, capabilities: body.capabilities },
      });
      const deployment = await registry.getByDeploymentId(body.deploymentId);
      res.status(201).json(deployment);
    },
  ];

  update = [
    requireOperator,
    validateBody(deploymentSchema.partial().extend({ deploymentId: z.string().min(1).max(100) })),
    async (req: Request, res: Response) => {
      const deploymentId = req.params.deploymentId;
      const existing = await registry.getByDeploymentId(deploymentId);
      if (!existing) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }
      if (existing.source === 'env') {
        res.status(403).json({ error: 'Env-sourced deployment is read-only' });
        return;
      }
      const body = req.body as Partial<z.infer<typeof deploymentSchema>>;
      await registry.upsert({
        deploymentId,
        baseUrl: body.baseUrl ?? existing.baseUrl,
        publicKey: body.publicKey ?? existing.publicKey,
        capabilities: body.capabilities ?? existing.capabilities,
        status: body.status ?? existing.status,
      });
      await writeAuditLog({
        tenantId: req.tenantId!,
        actor: req.actorId ?? 'system',
        module: 'federated',
        action: 'deployment.update',
        details: { deploymentId },
      });
      const deployment = await registry.getByDeploymentId(deploymentId);
      res.json(deployment);
    },
  ];

  deactivate = [
    requireOperator,
    async (req: Request, res: Response) => {
      const deploymentId = req.params.deploymentId;
      const existing = await registry.getByDeploymentId(deploymentId);
      if (!existing) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }
      if (existing.source === 'env') {
        res.status(403).json({ error: 'Env-sourced deployment is read-only' });
        return;
      }
      await registry.deactivate(deploymentId);
      await writeAuditLog({
        tenantId: req.tenantId!,
        actor: req.actorId ?? 'system',
        module: 'federated',
        action: 'deployment.deactivate',
        details: { deploymentId },
      });
      res.status(204).send();
    },
  ];
}
