import { Command } from '../entities/Command';

export interface CommandLogRepository {
  save(command: Command): Promise<Command>;
  findAll(limit?: number): Promise<Command[]>;
  findById(id: string): Promise<Command | null>;
}