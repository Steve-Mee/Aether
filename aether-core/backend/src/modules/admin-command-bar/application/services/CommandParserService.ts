import axios from 'axios';

export class CommandParserService {
  private ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  async parseCommand(naturalLanguage: string): Promise<any> {
    try {
      const prompt = `Je bent AETHER, een slimme AI voor e-commerce merchants. 
Analyseer dit commando en geef een JSON response terug met:
- intent: (PRICE_UPDATE, LOW_MARGIN_REPORT, APPROVE_CHANGES, CREATE_PRODUCT, etc.)
- action: (lower, raise, query, approve, etc.)
- parameters: object met extra info (bijv. { percentage: 8, color: "red", product: "sneakers" })
- confidence: getal tussen 0 en 1

Commando: "${naturalLanguage}"

Antwoord alleen met geldige JSON, geen extra tekst.`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: "llama3.2", // of "mistral", "phi3", etc. afhankelijk van wat lokaal draait
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1
        }
      });

      const text = response.data.response;
      // Probeer JSON te parsen uit de response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback als parsing mislukt
      return {
        intent: "UNKNOWN",
        action: null,
        parameters: {},
        confidence: 0.4
      };
    } catch (error) {
      console.error("Ollama error:", error);
      return {
        intent: "ERROR",
        action: null,
        parameters: { error: "Kon niet verbinden met lokale AI" },
        confidence: 0
      };
    }
  }
}