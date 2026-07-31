import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireViewer } from '../../../../shared/security/rbac';

export class CustomerController {
  static list = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listCustomers } = getCompositionRoot();
      const result = await listCustomers.execute(req.tenantId!);
      res.json(result);
    },
  ];

  static getById = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getCustomer } = getCompositionRoot();
      const customer = await getCustomer.execute(req.tenantId!, req.params.id);
      if (!customer) {
        res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });
        return;
      }
      res.json({ customer });
    },
  ];

  static listOrders = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getCustomer, listCustomerOrders } = getCompositionRoot();
      const customer = await getCustomer.execute(req.tenantId!, req.params.id);
      if (!customer) {
        res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });
        return;
      }
      const result = await listCustomerOrders.execute(req.tenantId!, req.params.id);
      res.json(result);
    },
  ];
}
