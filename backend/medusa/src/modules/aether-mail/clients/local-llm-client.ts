import axios from "axios";

export class LocalLLMClient {
  private ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  async classifyEmail(subject: string, body: string) {
    const prompt = `Classificeer deze email in één van: order_status, tracking_request, simple_question, complaint, return_request, payment_issue, supplier, spam.
Email:
Subject: ${subject}
Body: ${body}

Antwoord ALLEEN met JSON: {"category": "...", "confidence": 0.0-1.0}`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: "llama3.1:8b",
        prompt,
        stream: false,
        format: "json",
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      console.error("Local LLM classification failed, falling back to rule-based");
      return { category: "simple_question", confidence: 0.6 };
    }
  }

  async generateReply(email: any, context: any) {
    const prompt = `Je bent een behulpzame e-commerce support agent. Schrijf een korte, vriendelijke reply in dezelfde taal als de klant.
Context: ${JSON.stringify(context)}
Email: ${email.subject} - ${email.body}

Reply:`;

    const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
      model: "llama3.1:8b",
      prompt,
      stream: false,
    });

    return response.data.response.trim();
  }
}