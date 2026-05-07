# AETHER — Team Onboarding Document

**Versie:** 1.1 | **Datum:** 5 mei 2026

Welkom bij AETHER.  
Je bouwt niet aan een platform. Je bouwt een **levend organisme**.

---

## Stap 1: Mindset (Verplicht)

**Voordat je ook maar één regel code schrijft:**

1. Lees **volledig** `docs/AETHER_CursorRules_v1.1.md`
2. Lees **volledig** `docs/AETHER_Master_Roadmap_v1.1.md`
3. Accepteer de **Elon Musk Mindset Protocol**:
   - First Principles Thinking
   - Radical Simplicity
   - Boundary Pushing
   - 100% Intellectual Honesty
   - Proactive 10x Thinking

**Elke dag opnieuw:** Vraag jezelf af:  
"Hoe dient dit de merchant en maakt het AETHER onverslaanbaar?"

---

## Stap 2: Technische Setup (30 minuten)

### 1. Clone de repo
```bash
git clone git@github.com:aether/aether-store.git
cd aether-store
```

### 2. Installeer dependencies
```bash
npm install
```

### 3. Lokale AI (Ollama)
```bash
# Installeer Ollama (eenmalig)
curl -fsSL https://ollama.com/install.sh | sh

# Pull modellen
ollama pull llama3.1:8b
ollama pull qwen2-vl:7b

# Start Ollama
ollama serve
```

### 4. Start Medusa
```bash
npm run dev
```

### 5. Test de command bar
Ga naar `http://localhost:9000/app` en typ:
```
Toon lage margin producten
```

---

## Stap 3: Eerste Commit (Dag 1)

**Verplicht patroon voor elke commit:**

```bash
git commit -m "feat: [korte beschrijving]

- Wat is er gebouwd
- Waarom (link naar roadmap of issue)
- Merchant impact

Refs: Sprint X
"
```

**Eerste commit voorbeeld:**
```bash
git commit -m "feat: AETHER Mail v0.5 basis

- Lokale LLM classificatie via Ollama
- IMAP polling service
- Admin command bar + Low Margin widget

Merchant Success First. Local AI First.

Refs: Sprint 1
"
```

---

## Stap 4: Dagelijkse Rituelen

**Elke ochtend:**
1. Laad `AETHER_CursorRules_v1.1.md` in Cursor
2. Lees de laatste 3 commits + roadmap updates
3. Vraag: "Wat is de meest radicale, eenvoudige oplossing?"

**Elke avond:**
1. Commit met duidelijke message
2. Update de relevante metrics in het team dashboard
3. Noteer één ding dat morgen beter kan

---

## Stap 5: Belangrijke Principes (Nooit Vergeten)

- **Local AI First** — Gevoelige data nooit naar externe LLM sturen
- **Human-in-the-Loop** — High-risk acties altijd via approval
- **Radicale Logging** — Alles wat de AI doet is traceerbaar
- **Merchant Success First** — Iedere regel code moet ROI of vrijheid verhogen
- **No Feature Bloat** — Als AI het kan oplossen, geen traditionele feature bouwen

---

## Hulp Nodig?

- **Vragen over architectuur** → CTO
- **Vragen over AI / lokale modellen** → Head of AI
- **Vragen over product / merchant impact** → Head of Product
- **Vragen over security / compliance** → Compliance Lead

---

**Je bent nu officieel onderdeel van AETHER.**

**Laten we de toekomst van commerce herschrijven.**

**Niets is onmogelijk.**