import { CommandLogPort, CommandLogEntry } from '../../application/ports/CommandLogPort';
import { PrismaCommandLogRepository } from '../persistence/PrismaCommandLogRepository';

export class PrismaCommandLogAdapter implements CommandLogPort {
  private repo = new PrismaCommandLogRepository();

  save(entry: CommandLogEntry, options?: { undoable?: boolean; undoExpiresAt?: Date }) {
    return this.repo.save(entry, options);
  }

  findRecent(tenantId: string) {
    return this.repo.findRecent(tenantId);
  }

  findById(id: string, tenantId: string) {
    return this.repo.findById(id, tenantId);
  }
}
