import { Request, Response } from 'express';
import { CreateProductUseCase } from '../../application/use-cases/CreateProductUseCase';
import { PrismaProductRepository } from '../../infrastructure/persistence/PrismaProductRepository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const productRepository = new PrismaProductRepository(prisma);
const createProductUseCase = new CreateProductUseCase(productRepository);

export class ProductController {
  static async getAll(req: Request, res: Response) {
    const products = await productRepository.findAll();
    res.json(products);
  }

  static async create(req: Request, res: Response) {
    try {
      const product = await createProductUseCase.execute(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create product' });
    }
  }
}