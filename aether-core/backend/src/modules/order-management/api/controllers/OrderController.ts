import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaOrderRepository } from '../../infrastructure/persistence/PrismaOrderRepository';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/UpdateOrderStatusUseCase';

const prisma = new PrismaClient();
const orderRepository = new PrismaOrderRepository(prisma);
const createOrderUseCase = new CreateOrderUseCase();
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepository);

export class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      const { customerId, items } = req.body;

      if (!customerId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'customerId and items are required' });
      }

      const order = await createOrderUseCase.execute({
        customerId,
        items,
      });

      res.status(201).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async getOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await orderRepository.findById(id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }

  async getAllOrders(req: Request, res: Response) {
    try {
      const orders = await orderRepository.findAll();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const order = await updateOrderStatusUseCase.execute(id, status);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
}