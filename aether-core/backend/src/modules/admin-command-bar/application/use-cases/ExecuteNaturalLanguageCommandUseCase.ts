import { CommandParserService } from '../services/CommandParserService';

export class ExecuteNaturalLanguageCommandUseCase {
  private parser = new CommandParserService();

  async execute(naturalLanguageCommand: string) {
    const parsed = await this.parser.parseCommand(naturalLanguageCommand);

    // TODO: Route to correct module based on intent
    // For now: return the parsed result
    return {
      success: true,
      command: naturalLanguageCommand,
      intent: parsed.intent,
      action: parsed.action,
      confidence: parsed.confidence,
      executedAt: new Date().toISOString(),
      note: 'This is a mock response. Real execution will call other modules.'
    };
  }
}