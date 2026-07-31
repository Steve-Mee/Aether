import { prisma } from '../shared/prisma/client';
import { eventBus } from '../shared/events/eventBus';
import { ProcessIncomingEmailUseCase } from '../modules/aether-mail/application/use-cases/ProcessIncomingEmailUseCase';
import { EmailClassifierService } from '../modules/aether-mail/application/services/EmailClassifierService';
import { EmailContextProvider } from '../modules/aether-mail/application/services/EmailContextProvider';
import { smtpMailSender } from '../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter';
import { emailContextAdapter } from '../modules/aether-mail/infrastructure/adapters/PrismaEmailContextAdapter';
import { PrismaEmailRepository } from '../modules/aether-mail/infrastructure/persistence/PrismaEmailRepository';

export type { AppCompositionRoot } from './appCompositionRootTypes';

import { createBootstrapContext } from './wiring/bootstrapContext';
import { wireInfrastructure } from './wiring/wireInfrastructure';
import { wireIntelligence } from './wiring/wireIntelligence';
import { wireAdmin } from './wiring/wireAdmin';
import { wireMail } from './wiring/wireMail';
import { wireCommerce } from './wiring/wireCommerce';
import { wireStorefront } from './wiring/wireStorefront';
import { assembleCompositionRoot } from './wiring/assembleCompositionRoot';
import type { AppCompositionRoot } from './appCompositionRootTypes';

let root: AppCompositionRoot | null = null;
let bootstrapped = false;

/** Composition entry: wires adminData, intelligence, commerce, storefront, and mail via bootstrap/wiring/*. */

export function bootstrapApplication(): AppCompositionRoot {
  if (bootstrapped && root) {
    return root;
  }

  wireInfrastructure();

  const ctx = createBootstrapContext();
  const intel = wireIntelligence(ctx);
  const admin = wireAdmin(ctx, intel);
  const mail = wireMail(ctx, intel);
  const commerce = wireCommerce(ctx, intel);
  const storefront = wireStorefront(ctx, admin);

  root = assembleCompositionRoot(ctx, intel, admin, mail, commerce, storefront);
  bootstrapped = true;
  return root!;
}

export function getCompositionRoot(): AppCompositionRoot {
  if (!root) {
    throw new Error('Application not bootstrapped. Call bootstrapApplication() first.');
  }
  return root;
}

export async function processEventOutbox(): Promise<number> {
  return eventBus.processOutbox();
}

export function createProcessIncomingEmailUseCase(
  emailRepository: PrismaEmailRepository = new PrismaEmailRepository(prisma)
): ProcessIncomingEmailUseCase {
  if (root) {
    return root.processIncomingEmailUseCase;
  }

  return new ProcessIncomingEmailUseCase(
    emailRepository,
    new EmailClassifierService(),
    smtpMailSender,
    new EmailContextProvider(emailContextAdapter)
  );
}
