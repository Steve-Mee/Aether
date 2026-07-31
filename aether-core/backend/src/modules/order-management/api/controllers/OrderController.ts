import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { z } from 'zod';
import { validateBody } from '../../../../shared/security/validate';

const createSchema = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        price: z.number().nonnegative(),
      })
    )
    .min(1),
});

const statusSchema = z.object({ status: z.string().min(1) });

const shipSchema = z.object({
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
});

const refundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
});

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
        res.status(500).json({ error: { code: 'ORDER_CREATE_FAILED', message: 'Failed to create order' } });
      }
    },
  ];

  getOrder = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getOrderDetail } = getCompositionRoot();
      const order = await getOrderDetail.execute(req.tenantId!, req.params.id);
      if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
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
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
        return;
      }
      res.json(order);
    },
  ];

  shipOrder = [
    requireOperator,
    validateBody(shipSchema),
    async (req: Request, res: Response) => {
      const { shipOrder } = getCompositionRoot();
      const result = await shipOrder.execute(req.tenantId!, req.params.id, req.body);
      if (!result) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
        return;
      }
      res.status(201).json(result);
    },
  ];

  createRefund = [
    requireOperator,
    validateBody(refundSchema),
    async (req: Request, res: Response) => {
      try {
        const { createOrderRefund } = getCompositionRoot();
        const result = await createOrderRefund.execute(
          req.tenantId!,
          req.params.id,
          req.body,
          req.actorId
        );
        if (!result) {
          res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
          return;
        }
        res.status(201).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Refund failed';
        res.status(400).json({ error: { code: 'REFUND_FAILED', message } });
      }
    },
  ];
}
