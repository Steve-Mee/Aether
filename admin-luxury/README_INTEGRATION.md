# Volledige Integratie — Command Palette + Echte LLM Calls

## Wat is gedaan
- `lib/api.ts`: Clean client voor `processNaturalLanguageCommand` en `executeProposedAction`.
- `CommandPalette.tsx`: Volledig herschreven met echte async calls, loading states, error handling, keyboard support en Sonner toasts.

## Backend die je moet implementeren (of uitbreiden)

### 1. Endpoint: POST /api/command/process
Body: { query: string }

Dit endpoint moet:
1. Context Provider aanroepen (producten, orders, klanten, mail threads, supplier data).
2. De query doorsturen naar je LangGraph multi-agent of een dedicated Command Agent.
3. Lokale LLM (Ollama / vLLM + Llama 3.1 of Qwen) gebruiken voor intent detectie + besluitvorming.
4. Decision Engine gebruiken voor confidence + riskLevel + proposedAction.
5. Structured output teruggeven als array van CommandResult.

Voorbeeld response:
[
  {
    "id": "act_123",
    "type": "insight",
    "title": "Prijsverlaging aanbevolen voor SKU-4821",
    "description": "Huidige marge te hoog, concurrentie lager. Verwachte uplift +9%.",
    "confidence": 89,
    "riskLevel": "low",
    "proposedAction": { "type": "UPDATE_PRICE", "payload": { "productId": "4821", "newPrice": 89.99 } },
    "module": "Pricing Agent"
  }
]

### 2. Endpoint: POST /api/command/execute
Body: { actionId: string, payload: any }

Dit endpoint voert de actie uit via de juiste module (Pricing, Inventory, Mail, etc.) of stuurt het door naar Human Approval Queue als riskLevel high is.

Retourneer { success: true, message: string, executedActionId?: string }

## Volgende stap
Maak deze twee endpoints in je bestaande Express/FastAPI laag en koppel ze aan je bestaande LLM client + Decision Engine.

Daarna is je Admin Command Center écht autonoom en LLM-powered.

Niets is onmogelijk.