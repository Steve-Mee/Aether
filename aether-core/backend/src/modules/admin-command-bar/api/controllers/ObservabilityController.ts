import { Request, Response } from 'express';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import {
  getObservabilityStatus,
  isObservabilityProbeAllowed,
} from '../../../../shared/observability/observabilityProbe';

export class ObservabilityController {
  getStatus = [
    requireViewer,
    (_req: Request, res: Response) => {
      res.json(getObservabilityStatus());
    },
  ];

  probeError = [
    requireOperator,
    (_req: Request, _res: Response) => {
      if (!isObservabilityProbeAllowed()) {
        const err = new Error('Observability probe disabled') as Error & { statusCode?: number };
        err.statusCode = 403;
        throw err;
      }
      throw new Error('AETHER observability probe — intentional 500 for Sentry verification');
    },
  ];
}
