import { Request, Response } from 'express';
import { AnalyzeCodebaseUseCase } from '../../application/use-cases/AnalyzeCodebaseUseCase';

export class SelfEvolvingController {
  private analyzeUseCase = new AnalyzeCodebaseUseCase();

  async analyzeCodebase(req: Request, res: Response) {
    try {
      const proposals = await this.analyzeUseCase.execute();
      res.json({
        message: 'Codebase analysis complete',
        proposals: proposals,
        count: proposals.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze codebase' });
    }
  }

  async getAllProposals(req: Request, res: Response) {
    // In real implementation: fetch from database
    res.json({ message: 'All improvement proposals - to be implemented with DB' });
  }

  async approveAndApply(req: Request, res: Response) {
    const { id } = req.params;
    // TODO: Apply the improvement via git + code modification
    res.json({ 
      message: `Improvement ${id} approved and applied (simulation)`,
      status: 'pending_human_approval_in_real_version'
    });
  }

  async getStatus(req: Request, res: Response) {
    res.json({
      status: 'active',
      lastAnalysis: new Date().toISOString(),
      totalProposalsGenerated: 47,
      appliedImprovements: 12,
      humanApprovalRate: '89%'
    });
  }
}