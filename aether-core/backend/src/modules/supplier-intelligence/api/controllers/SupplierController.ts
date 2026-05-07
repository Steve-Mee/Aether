import { Request, Response } from 'express';
import { MonitorSupplierUseCase } from '../../application/use-cases/MonitorSupplierUseCase';
import { PrismaSupplierRepository } from '../../infrastructure/persistence/PrismaSupplierRepository';
import { WebScraperService } from '../../application/services/WebScraperService';
import { PriceChangeDetectorService } from '../../application/services/PriceChangeDetectorService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const supplierRepository = new PrismaSupplierRepository(prisma);
const scraper = new WebScraperService();
const detector = new PriceChangeDetectorService();
const monitorUseCase = new MonitorSupplierUseCase(supplierRepository, scraper, detector);

export class SupplierController {
  static async getAll(req: Request, res: Response) {
    const suppliers = await supplierRepository.findAll();
    res.json(suppliers);
  }

  static async monitor(req: Request, res: Response) {
    try {
      const result = await monitorUseCase.execute(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to monitor supplier' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const supplier = await supplierRepository.create(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create supplier' });
    }
  }
}