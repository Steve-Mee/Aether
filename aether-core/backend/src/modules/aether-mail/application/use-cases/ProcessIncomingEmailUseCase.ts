import { EmailMessage } from '../../domain/entities/EmailMessage';
import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { EmailClassifierService } from '../services/EmailClassifierService';

export class ProcessIncomingEmailUseCase {
  constructor(
    private emailRepository: EmailRepository,
    private classifier: EmailClassifierService
  ) {}

  async execute(rawEmail: {
    from: string;
    subject?: string;
    body?: string;
  }): Promise<EmailMessage> {
    // 1. Create email entity
    const email = EmailMessage.create(rawEmail);

    // 2. Classify with LLM
    const classification = await this.classifier.classify(rawEmail);

    // 3. Update status based on classification
    email.markAsProcessed(classification.riskLevel);

    // 4. Save to database
    const savedEmail = await this.emailRepository.create(email);

    // 5. If low risk → auto reply (placeholder for now)
    if (classification.riskLevel === 'low') {
      // TODO: Implement auto-reply logic
      savedEmail.markAsReplied();
      await this.emailRepository.update(savedEmail);
    }

    return savedEmail;
  }
}