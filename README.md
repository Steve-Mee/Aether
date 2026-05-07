# AETHER — Living E-commerce Organism (v1.1 Foundation)

**Het objectief beste zelf-lerende, zelf-evoluerende en markt-bewuste AI-e-commerce organisme ter wereld.**

Deze repository bevat de **basis** van het AETHER project zoals gedefinieerd in de Master Roadmap v1.1 (5 mei 2026).

## Projectstructuur (aanbevolen)

```
aether/
├── README.md
├── docs/
│   ├── SETUP.md
│   ├── ROADMAP.md → symlink naar AETHER_Master_Roadmap_v1.1.md
│   └── CURSORRULES.md → symlink naar AETHER_CursorRules_v1.1.md
├── backend/
│   ├── medusa/                 # MedusaJS core + AETHER plugins
│   │   ├── package.json
│   │   ├── medusa-config.ts
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── aether-mail/
│   │       │   ├── supplier-intelligence/
│   │       │   └── admin-extensions/
│   │       └── api/
│   └── ai-agents/              # Lokale Python agents (Ollama / vLLM)
│       ├── mail-agent/
│       │   └── agent.py
│       └── supplier-agent/
│           └── crawler.py
├── admin/
│   └── command-center/         # React widgets voor Medusa Admin
│       ├── CommandBar.tsx
│       └── widgets/
├── docker/
│   ├── docker-compose.yml      # Air-gapped inference + Medusa
│   └── aether-mail-inference.Dockerfile
└── scripts/
    └── eval-harness/           # Wekelijkse eval scripts
```

---

## Hoe voeg je de open source MedusaJS code toe aan dit project?

**Stap-voor-stap (uit te voeren op je lokale machine — niet in deze sandbox):**

### 1. Installeer MedusaJS (officiële manier)

```bash
# Zorg dat je Node.js 20+ en PostgreSQL 16+ hebt
npx create-medusa-app@latest aether-store --yes

cd aether-store
```

Dit genereert een volledige Medusa 2.x project met:
- `medusa-config.ts`
- `src/modules/` (leeg)
- Admin dashboard (React)
- Storefront (Next.js optioneel)

### 2. Kopieer de AETHER custom modules

Kopieer de inhoud van `backend/medusa/src/modules/` uit deze repository naar `aether-store/src/modules/`

```bash
cp -r /path/to/aether-project/backend/medusa/src/modules/* aether-store/src/modules/
```

### 3. Installeer extra dependencies (nodig voor v1.1 features)

```bash
cd aether-store

# Voor AETHER Mail + Supplier Agent
npm install @medusajs/medusa @medusajs/utils playwright aioimaplib  # (Python deel apart)

# Voor lokale AI (optioneel maar aanbevolen)
# Installeer Ollama apart: https://ollama.com
ollama pull llama3.1:70b
ollama pull qwen2-vl:7b   # voor vision in Supplier Agent
```

### 4. Registreer de AETHER modules in medusa-config.ts

Open `medusa-config.ts` en voeg toe:

```ts
import { AetherMailModule } from "./src/modules/aether-mail";
import { SupplierIntelligenceModule } from "./src/modules/supplier-intelligence";
import { AdminExtensionsModule } from "./src/modules/admin-extensions";

export default defineConfig({
  // ... bestaande config
  modules: [
    AetherMailModule,
    SupplierIntelligenceModule,
    AdminExtensionsModule,
    // ... andere modules
  ],
});
```

### 5. Start de stack (met lokale AI)

```bash
# Terminal 1: Medusa backend
npm run dev

# Terminal 2: Lokale inference (air-gapped waar mogelijk)
docker compose -f docker/docker-compose.yml up

# Terminal 3: Ollama (indien lokaal)
ollama serve
```

### 6. Test de nieuwe features

- Ga naar `http://localhost:9000/app` (Medusa Admin)
- Je ziet nu extra widgets + command bar (van Admin Extensions)
- Test AETHER Mail via de nieuwe API routes
- Configureer een leverancier in de Supplier Intelligence settings

---

## Belangrijke bestanden die je nu hebt

- `AETHER_Master_Roadmap_v1.1.md` — volledige roadmap
- `AETHER_PoC_Specifications_v1.1.md` — implementatie details
- `AETHER_CursorRules_v1.1.md` — verplichte regels voor alle agents
- `aether-project/backend/medusa/src/modules/aether-mail/` — echte code (geen placeholders)
- `aether-project/backend/ai-agents/mail-agent/agent.py` — lokale LLM agent

---

## Volgende stappen (na setup)

1. Review alle code in `backend/medusa/src/modules/`
2. Pas de `medusa-config.ts` aan zoals hierboven
3. Start met Sprint 1 van Fase 1 (zie roadmap)
4. Laad altijd `AETHER_CursorRules_v1.1.md` in Cursor voordat je begint met coden

**Merchant Success First. Local AI First. Niets is onmogelijk.**

---

*Gemaakt op 5 mei 2026 — AETHER Core Team*