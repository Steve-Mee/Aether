import { CommandLogPort, CommandLogEntry } from '../../application/ports/CommandLogPort';
import { PrismaCommandLogRepository } from '../persistence/PrismaCommandLogRepository';

export class PrismaCommandLogAdapter implements CommandLogPort {
  private repo = new PrismaCommandLogRepository();

  save(entry: CommandLogEntry): Promise<void> {
    return this.repo.save(entry).then(() => undefined);
  }

  findRecent(tenantId: string) {
    return this.repo.findRecent(tenantId);
  }
}
