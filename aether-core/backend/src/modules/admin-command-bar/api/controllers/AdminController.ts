import { Request, Response } from 'express';
import { ExecuteNaturalLanguageCommandUseCase } from '../../application/use-cases/ExecuteNaturalLanguageCommandUseCase';

export class AdminController {
  private executeCommandUseCase = new ExecuteNaturalLanguageCommandUseCase();

  async executeCommand(req: Request, res: Response) {
    try {
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      const result = await this.executeCommandUseCase.execute(command);
      res.json(result);
    } catch (error) {
      console.error('Command execution error:', error);
      res.status(500).json({ error: 'Failed to execute command' });
    }
  }

  async getDashboardSummary(req: Request, res: Response) {
    // TODO: Integrate with other modules for real data
    res.json({
      lowMarginProducts: 12,
      pendingApprovals: 7,
      unreadEmails: 23,
      recentCommands: 5,
      timestamp: new Date().toISOString()
    });
  }

  async getCommandHistory(req: Request, res: Response) {
    res.json({ 
      message: 'Command history endpoint - to be implemented with Prisma',
      commands: []
    });
  }
}