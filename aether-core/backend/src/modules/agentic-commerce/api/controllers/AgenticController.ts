import { Request, Response } from 'express';
import { StartNegotiationUseCase } from '../../application/use-cases/StartNegotiationUseCase';
import { RespondToOfferUseCase } from '../../application/use-cases/RespondToOfferUseCase';

export class AgenticController {
  private startNegotiationUseCase = new StartNegotiationUseCase();
  private respondToOfferUseCase = new RespondToOfferUseCase();

  async startNegotiation(req: Request, res: Response) {
    try {
      const { customerAgentId, merchantAgentId, productId, initialOffer } = req.body;

      if (!customerAgentId || !merchantAgentId || !productId || !initialOffer) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const negotiation = await this.startNegotiationUseCase.execute({
        customerAgentId,
        merchantAgentId,
        productId,
        initialOffer
      });

      res.json(negotiation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to start negotiation' });
    }
  }

  async respondToOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { offer, agentId } = req.body;

      if (!offer || !agentId) {
        return res.status(400).json({ error: 'Missing offer or agentId' });
      }

      const result = await this.respondToOfferUseCase.execute(id, { offer, agentId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to respond to offer' });
    }
  }

  async getNegotiation(req: Request, res: Response) {
    // TODO: Implement get negotiation by ID
    res.json({ message: 'Get negotiation endpoint - to be implemented' });
  }

  async getActiveNegotiations(req: Request, res: Response) {
    // TODO: Implement list active negotiations
    res.json({ message: 'Active negotiations endpoint - to be implemented' });
  }
}