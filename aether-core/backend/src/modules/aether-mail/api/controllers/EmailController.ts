import { Request, Response } from 'express';
import { ProcessIncomingEmailUseCase } from '../../application/use-cases/ProcessIncomingEmailUseCase';
import { PrismaEmailRepository } from '../../infrastructure/persistence/PrismaEmailRepository';
import { EmailClassifierService } from '../../application/services/EmailClassifierService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const emailRepository = new PrismaEmailRepository(prisma);
const classifier = new EmailClassifierService();
const processEmailUseCase = new ProcessIncomingEmailUseCase(emailRepository, classifier);

export class EmailController {
  static async getAll(req: Request, res: Response) {
    const emails = await emailRepository.findAll();
    res.json(emails);
  }

  static async processIncoming(req: Request, res: Response) {
    try {
      const email = await processEmailUseCase.execute(req.body);
      res.status(201).json(email);
    } catch (error) {
      res.status(400).json({ error: 'Failed to process email' });
    }
  }
}