# AETHER — Eerste Echte Implementatie (Klaar om te committen)

**Bestand:** `backend/medusa/src/modules/aether-mail/`

Dit is de **eerste productie-klare code** die je direct kunt kopiëren naar je Medusa project en committen.

## Stappen om te starten

1. Maak een nieuw Medusa project:
   ```bash
   npx create-medusa-app@latest aether-store
   cd aether-store
   ```

2. Kopieer de volledige `aether-mail` map uit deze package naar `src/modules/`

3. Registreer in `medusa-config.ts`:
   ```ts
   import { AetherMailModule } from "./src/modules/aether-mail";
   import { AdminExtensionsModule } from "./src/modules/admin-extensions";

   export default defineConfig({
     modules: [
       AetherMailModule,
       AdminExtensionsModule,
     ],
   });
   ```

4. Installeer dependencies:
   ```bash
   npm install axios
   ```

5. Start Ollama (lokaal):
   ```bash
   ollama pull llama3.1:8b
   ollama serve
   ```

6. Start Medusa:
   ```bash
   npm run dev
   ```

7. Test de command bar:
   - Ga naar `http://localhost:9000/app`
   - Typ in de globale search: "Toon lage margin producten"

---

## Commit Message (kopieer-plak)

```
feat: AETHER Mail v0.5 + AI-Native Admin Command Center

- Volledige lokale LLM integratie (Ollama)
- IMAP polling + auto-classificatie + approval gates
- 3 Admin widgets (Low Margin, Supplier Alerts, Mail Summary)
- Natuurlijke taal command bar
- Air-gapped inference container support

Merchant Success First. Local AI First.

Refs: Sprint 1
```