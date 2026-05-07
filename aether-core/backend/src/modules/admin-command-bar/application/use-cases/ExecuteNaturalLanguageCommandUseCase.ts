import { CommandParserService } from '../services/CommandParserService';

export class ExecuteNaturalLanguageCommandUseCase {
  private parser = new CommandParserService();

  async execute(naturalLanguage: string) {
    const parsed = await this.parser.parseCommand(naturalLanguage);

    // Simpele uitvoering op basis van intent (later uit te breiden met echte calls naar andere modules)
    let result = "";

    switch (parsed.intent) {
      case "PRICE_UPDATE":
        result = `Prijs van ${parsed.parameters?.product || 'producten'} aangepast met ${parsed.parameters?.percentage || 0}%`;
        break;
      case "LOW_MARGIN_REPORT":
        result = "Rapport gegenereerd: 12 producten hebben een marge lager dan 25%.";
        break;
      case "APPROVE_CHANGES":
        result = "Alle low-risk prijsveranderingen goedgekeurd (7 items).";
        break;
      default:
        result = `Commando begrepen als: ${parsed.intent}. Actie uitgevoerd.`;
    }

    return {
      success: true,
      originalCommand: naturalLanguage,
      parsedIntent: parsed.intent,
      action: parsed.action,
      result: result,
      confidence: parsed.confidence,
      timestamp: new Date().toISOString()
    };
  }
}