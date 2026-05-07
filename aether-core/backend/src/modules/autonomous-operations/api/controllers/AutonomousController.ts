import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AutonomousController {
  async getAllDecisions(_req: Request, res: Response): Promise<void> {
    try {
      const decisions = await prisma.decision.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json(decisions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch decisions' });
    }
  }

  async triggerDecision(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'manual', result = 'pending' } = req.body ?? {};
      const decision = await prisma.decision.create({
        data: { type, result },
      });
      res.status(201).json(decision);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create decision' });
    }
  }

  async getDecisionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const decision = await prisma.decision.findUnique({ where: { id } });
      if (!decision) {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      res.json(decision);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch decision' });
    }
  }
}
