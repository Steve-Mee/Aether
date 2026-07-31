import { ProcessIncomingEmailUseCase } from '../../modules/aether-mail/application/use-cases/ProcessIncomingEmailUseCase';
import { EmailClassifierService } from '../../modules/aether-mail/application/services/EmailClassifierService';
import { EmailContextProvider } from '../../modules/aether-mail/application/services/EmailContextProvider';
import { smtpMailSender } from '../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter';
import { emailContextAdapter } from '../../modules/aether-mail/infrastructure/adapters/PrismaEmailContextAdapter';

import { type BootstrapContext } from './bootstrapContext';
import type { IntelligenceWiring } from './wireIntelligence';

export interface MailWiring {
  processIncomingEmailUseCase: ProcessIncomingEmailUseCase;
}

export function wireMail(ctx: BootstrapContext, intel: IntelligenceWiring): MailWiring {
  const { intelligence } = intel;

  const processIncomingEmailUseCase = new ProcessIncomingEmailUseCase(
    ctx.emailRepository,
    new EmailClassifierService(),
    smtpMailSender,
    new EmailContextProvider(emailContextAdapter),
    undefined,
    undefined,
    intelligence.personalBrainRegistry,
    intelligence.peerDelegationBridge
  );

  return { processIncomingEmailUseCase };
}
