import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CreateOrderUseCase {
  async execute(data: {
    customerId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
  }) {
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        customerId: data.customerId,
        total,
        status: 'pending',
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  }
}