import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { z } from 'zod';
import { validateBody } from '../../../../shared/security/validate';

const createSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
    })
  ).min(1),
});

const statusSchema = z.object({ status: z.string().min(1) });

export class OrderController {
  createOrder = [
    requireOperator,
    validateBody(createSchema),
    async (req: Request, res: Response) => {
      try {
        const { createOrder } = getCompositionRoot();
        const order = await createOrder.execute({
          ...req.body,
          tenantId: req.tenantId!,
        });
        res.status(201).json(order);
      } catch {
        res.status(500).json({ error: 'Failed to create order' });
      }
    },
  ];

  getOrder = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { orderRepository } = getCompositionRoot();
      const order = await orderRepository.findById(req.params.id, req.tenantId!);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json(order);
    },
  ];

  getAllOrders = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { orderRepository } = getCompositionRoot();
      const orders = await orderRepository.findAll(req.tenantId!);
      res.json(orders);
    },
  ];

  updateStatus = [
    requireOperator,
    validateBody(statusSchema),
    async (req: Request, res: Response) => {
      const { updateOrderStatus } = getCompositionRoot();
      const order = await updateOrderStatus.execute(
        req.params.id,
        req.body.status,
        req.tenantId!
      );
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json(order);
    },
  ];
}
