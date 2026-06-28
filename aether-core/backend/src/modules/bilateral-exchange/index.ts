import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireOperator, requireViewer } from '../../shared/security/rbac';
import { validateBody } from '../../shared/security/validate';
import { getCompositionRoot } from '../../bootstrap/compositionRoot';
import { BilateralHttpError, mapBilateralError } from './application/bilateralErrors';

const proposeSchema = z
  .object({
    consumerTenantId: z.string().min(1).optional(),
    consumerTenantSlug: z.string().min(1).optional(),
    schemaKey: z.string().min(1),
    allowedFields: z.array(z.string().min(1)).min(1),
    ttlExpiresAt: z.string().datetime().optional(),
  })
  .refine((data) => Boolean(data.consumerTenantId || data.consumerTenantSlug), {
    message: 'consumerTenantId or consumerTenantSlug required',
  });

const publishSchema = z.object({
  contractId: z.string().min(1),
});

const consumeSchema = z.object({
  packageId: z.string().min(1),
});

const router = Router();

function getService() {
  return getCompositionRoot().bilateralExchangeService;
}

function handleBilateral(
  handler: (req: Request, res: Response) => Promise<void>
): Array<(req: Request, res: Response, next: NextFunction) => void> {
  return [
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await handler(req, res);
      } catch (err) {
        const mapped = mapBilateralError(err);
        next(mapped);
      }
    },
  ];
}

router.get(
  '/schemas',
  requireViewer,
  ...handleBilateral(async (_req, res) => {
    const schemas = await getService().listSchemas();
    res.json({ schemas });
  })
);

router.get(
  '/contracts',
  requireViewer,
  ...handleBilateral(async (req, res) => {
    const contracts = await getService().listContracts(req.tenantId!);
    res.json({ contracts });
  })
);

router.get(
  '/contracts/:id',
  requireViewer,
  ...handleBilateral(async (req, res) => {
    const contract = await getService().getContract(req.params.id, req.tenantId!);
    res.json(contract);
  })
);

router.get(
  '/contracts/:id/packages',
  requireViewer,
  ...handleBilateral(async (req, res) => {
    const packages = await getService().listPackages(req.params.id, req.tenantId!);
    res.json({ packages });
  })
);

router.get(
  '/contracts/:id/audit',
  requireViewer,
  ...handleBilateral(async (req, res) => {
    const audit = await getService().listContractAudit(req.params.id, req.tenantId!);
    res.json({ audit });
  })
);

router.post(
  '/contracts',
  requireOperator,
  validateBody(proposeSchema),
  ...handleBilateral(async (req, res) => {
    const body = req.body as z.infer<typeof proposeSchema>;
    const contract = await getService().proposeContract({
      providerTenantId: req.tenantId!,
      consumerTenantId: body.consumerTenantId,
      consumerTenantSlug: body.consumerTenantSlug,
      schemaKey: body.schemaKey,
      allowedFields: body.allowedFields,
      ttlExpiresAt: body.ttlExpiresAt ? new Date(body.ttlExpiresAt) : undefined,
    });
    res.status(201).json(contract);
  })
);

router.post(
  '/contracts/:id/accept',
  requireOperator,
  ...handleBilateral(async (req, res) => {
    const contract = await getService().acceptContract(req.params.id, req.tenantId!);
    res.json(contract);
  })
);

router.post(
  '/contracts/:id/revoke',
  requireOperator,
  ...handleBilateral(async (req, res) => {
    await getService().revokeContract(req.params.id, req.tenantId!);
    res.status(204).send();
  })
);

router.post(
  '/packages',
  requireOperator,
  validateBody(publishSchema),
  ...handleBilateral(async (req, res) => {
    const body = req.body as z.infer<typeof publishSchema>;
    const pkg = await getService().publishPackage(body.contractId, req.tenantId!);
    res.status(201).json(pkg);
  })
);

router.post(
  '/packages/consume',
  requireOperator,
  validateBody(consumeSchema),
  ...handleBilateral(async (req, res) => {
    const body = req.body as z.infer<typeof consumeSchema>;
    const result = await getService().consumePackage(body.packageId, req.tenantId!);
    res.json(result);
  })
);

export { BilateralHttpError };
export default router;
