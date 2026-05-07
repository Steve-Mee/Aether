# AETHER PoC Specificaties v1.1
**Volledige implementatie-specificaties voor de drie nieuwe kernfeatures in Fase 1**

**Versie:** 1.1  
**Datum:** 5 mei 2026  
**Status:** Klaar voor sprint planning  
**Eigenaar:** AETHER AI Research Team + Engineering Leads

---

## Inleiding

Deze specificaties zijn de **enige bron van waarheid** voor de implementatie van:
- AETHER Mail v0.5
- Supplier Intelligence Agent v0.5
- AI-Native Admin Command Center v0.5

Elk PoC volgt de **Elon Musk Mindset Protocol**:
- First Principles → Radicale eenvoud → Boundary pushing → 100% eerlijkheid → 10x denken
- Merchant Success First: Iedere regel code moet de merchant méér tijd, geld of vrijheid opleveren
- Veiligheid & Privacy by Design: Lokale AI waar mogelijk, zero-trust, air-gapped waar nodig

---

## PoC 1: AETHER Mail v0.5

### 1.1 Doelstelling (First Principles)
**Probleem**: Merchants verliezen 8-15 uur per week aan email overload. Geen enkele e-commerce tool biedt een écht intelligente, privacy-veilige unified inbox die ook acties uitvoert.

**Oplossing**: Een volledig lokale AI agent die **alle** inkomende communicatie leest, begrijpt, classificeert, beantwoordt en waar mogelijk autonoom afhandelt — zonder ooit data naar OpenAI, Grok of andere providers te sturen.

**10x Doel**: Merchant bespaart minimaal 6 uur/week + 30% snellere responstijd naar klanten + 0 data leaks.

### 1.2 Scope v0.5 (Pilot — 50 merchants, 3 maanden)
**In scope**:
- IMAP integratie (Gmail, Outlook365, custom IMAP4)
- SMTP uitgaand (via merchant credentials of AETHER relay met SPF/DKIM)
- Lokale LLM inference (Ollama of vLLM — Llama 3.1 70B of fine-tuned 8B model)
- Auto-classificatie (5 categorieën) met >85% accuracy
- Context-aware reply drafting (order + customer + previous emails via Medusa + Weaviate RAG)
- Low-risk auto-actions (tracking sturen, retourlabel, simpele statusvragen)
- High-risk proposal queue in Admin (met één-klik approve/reject + reason)
- Volledige audit trail (onherroepelijk, exporteerbaar)
- Medusa integratie (order.status update, customer note, etc.)

**Out of scope v0.5**:
- Multi-account management (later v1.0)
- Supplier negotiation (later v1.0)
- Voice input/output (later)
- BCC/CC parsing (simpel houden)

### 1.3 Technische Architectuur (Radicale Eenvoud)

```
Email Provider (IMAP)
   ↓ (polling every 30s of webhook via Mailgun/SendGrid inbound)
AETHER Mail Microservice (FastAPI + Python 3.12)
   ├── IMAP Client (aioimaplib + encryption at rest)
   ├── Classifier Agent (LangGraph + lokale LLM)
   ├── Context Retriever (Medusa GraphQL + Weaviate semantic search)
   ├── Action Planner (tool calling met Pydantic schemas)
   ├── Human Review Gate (als confidence < 0.85 of high-risk)
   └── SMTP Sender + Medusa Event Emitter
   ↓
MedusaJS (custom module: aether_mail)
   └── Event Bus (Pulsar) → Pricing/Inventory/Attribution Agents
```

**Container Strategy (Zero-Trust)**:
- `aether-mail-inference`: Air-gapped Docker (no network) — alleen lokale LLM
- `aether-mail-orchestrator`: Beperkte outbound (alleen IMAP/SMTP van merchant + interne Medusa API)
- Secrets: HashiCorp Vault of Kubernetes secrets + envelope encryption

### 1.4 LLM Prompts & Tool Calling (Boundary Pushing)

**System Prompt (gecomprimeerd)**:
```
Je bent AETHER Mail Agent — extreem behulpzame, eerlijke en efficiënte assistent voor e-commerce merchants.
Regels:
1. Nooit data verzinnen. Als je het niet zeker weet → human review.
2. Altijd context ophalen uit Medusa voordat je antwoordt.
3. Low-risk acties (tracking, simpele vragen) mag je autonoom doen als confidence > 0.90.
4. High-risk (geld, retour, klachten) → altijd proposal + reason.
5. Antwoord in dezelfde taal als de klant.
6. Blijf extreem kort en duidelijk.
```

**Tool Schema (Pydantic)**:
```python
class MailAction(BaseModel):
    action: Literal["send_reply", "update_order_status", "create_return", "escalate", "ignore"]
    reply_text: str | None = None
    order_id: str | None = None
    new_status: str | None = None
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)
```

### 1.5 Veiligheid & Compliance Checklist
- [x] Air-gapped inference container
- [x] Alle prompts + outputs immutable gelogd (TimescaleDB)
- [x] Confidence threshold + human gate
- [x] Merchant kan per categorie auto-action uitzetten
- [x] GDPR: Data nooit verlaat merchant infra
- [x] SOC2-ready logging
- [x] Rate limiting + anomaly detection (te veel mails → alert)

### 1.6 Success Metrics & Eval Harness
- Accuracy classificatie: >85% (eval set van 500 hand-gelabelde mails)
- Escalation rate: <20%
- Merchant tijd bespaard: >4 uur/week (self-reported + audit log analyse)
- Response time: <2 uur gemiddeld (vs 12+ uur nu)
- 0 security incidents in 3 maanden pilot

**Eval Script**: Wekelijks draaien op 100 random mails + merchant feedback loop.

### 1.7 Implementatie Planning (2 sprints)
**Sprint 1 (2 weken)**: IMAP/SMTP + classificatie + basis RAG + Admin proposal queue
**Sprint 2 (2 weken)**: Tool calling + Medusa integratie + eval harness + pilot onboarding

**Resources**: 2 engineers + 1 AI specialist (lokale modellen)

---

## PoC 2: Supplier Intelligence Agent v0.5

### 2.1 Doelstelling (First Principles)
**Probleem**: Merchants besteden 10-20 uur/week aan handmatig prijzen en voorraad controleren bij 5-15 leveranciers. Fouten = gemiste verkoop of kapitaal in voorraad.

**Oplossing**: Een volledig lokale, sandboxed AI agent die leveranciers-websites **veiliger en slimmer** monitort dan een mens ooit kan — en direct sync met Medusa.

**10x Doel**: 80% reductie in handmatige inkoop tijd + 95%+ accurate prijs/voorraad data + 0 compliance issues.

### 2.2 Scope v0.5 (Pilot — 20 merchants, 5 leveranciers)
**In scope**:
- Per leverancier JSON config (start URLs, crawl frequency, approval policy, allowed domains)
- Sandboxed Playwright (stealth, user-agent rotation, robots.txt parser)
- Multi-modal lokale LLM (Qwen2-VL of LLaVA-NeXT) voor product page extraction
- Structured extraction → Medusa Product/Variant/Inventory mapping
- Diff engine + proposal/ auto-sync
- Approval workflow in Admin (voor nieuwe producten of >10% prijs wijziging)
- Volledige audit log + screenshot archive (30 dagen)

**Out of scope v0.5**:
- Login-based scraping (alleen public of merchant-provided credentials in vault)
- API-first suppliers (dat komt later via native integraties)
- Auto-onboarding nieuwe leveranciers (v1.0)

### 2.3 Technische Architectuur (Radicale Eenvoud + Veiligheid)

```
Scheduler (APScheduler / Celery beat)
   ↓
Supplier Job Queue
   ↓
Playwright Container (isolated, --network=bridge, max 5 min lifetime)
   ├── robots.txt check
   ├── Stealth browser (puppeteer-extra-stealth equivalent)
   ├── Screenshot + HTML capture
   └── Send to Inference Container
   ↓
Inference Container (air-gapped, lokale vision+text LLM)
   ├── Structured extraction (Instructor + Pydantic)
   ├── Price/stock/variant normalisatie
   └── Diff vs previous state (stored in Neo4j)
   ↓
Medusa Plugin (aether_supplier_sync)
   ├── Create draft product (indien nieuw)
   ├── Update inventory / price (trusted suppliers)
   └── Emit event → Pricing Agent + Attribution
```

**Container Hardening**:
- Playwright: Read-only filesystem, no persistent storage, killed after 5 min
- Inference: Completely air-gapped (no network at all)
- Orchestrator: Only allowed outbound to merchant-configured domains + internal Medusa

### 2.4 Extraction Prompt + Schema (Boundary Pushing)

**Vision + Text Prompt**:
```
Analyseer deze productpagina screenshot + HTML.
Extraheer exact:
- title (max 120 chars)
- price (inclusief currency, incl/excl BTW)
- stock_status (in_stock | out_of_stock | limited | unknown)
- variants (array van {name, price, stock})
- images (max 5 URLs)
- description (samenvatting 200 chars)
- delivery_time (string of null)
Return ONLY valid JSON volgens dit schema. Nooit verzinnen.
```

**Pydantic Schema** (strict):
```python
class SupplierProduct(BaseModel):
    external_id: str
    title: str
    price: float
    currency: str = "EUR"
    stock: int | None
    variants: list[dict]
    image_urls: list[str]
    description: str | None
    delivery_days: int | None
    confidence: float
```

### 2.5 Veiligheid & Compliance (Eerlijkheid)
- **Alleen publieke data** of expliciet door merchant geautoriseerde credentials
- Automatische robots.txt + ToS check bij onboarding (merchant moet “Ik heb ToS gelezen” aanvinken)
- Rate limit: 1 request / 2-5 seconden per domain + globale throttle
- Logging: Iedere request + screenshot + LLM output = immutable
- Legal: Auto-generated log entry “Accessed on behalf of merchant X for legitimate business purpose”
- Kill switch: Merchant kan per leverancier “pause” of “blacklist” met één klik

### 2.6 Success Metrics
- Prijs detectie accuracy: >92% (vs handmatige controle)
- Stock status accuracy: >85%
- Nieuwe producten correct gemapped: >75%
- Tijd bespaard per merchant: >6 uur/week
- 0 security incidents / ToS klachten in pilot

**Eval Harness**: Wekelijks 50 random product pages handmatig valideren + merchant feedback.

### 2.7 Implementatie Planning (2 sprints)
**Sprint 1**: Playwright sandbox + robots.txt + basis extraction + Admin config UI
**Sprint 2**: Diff engine + Medusa sync + approval workflow + eval + pilot

**Resources**: 2 engineers + 1 AI specialist (vision models) + 1 security engineer (review)

---

## PoC 3: AI-Native Admin Command Center v0.5

### 3.1 Doelstelling (First Principles)
**Probleem**: De Medusa Admin is krachtig maar traditioneel — merchants moeten navigeren, filteren, klikken. Dit is 2026. AI kan dit radicaal simpeler maken.

**Oplossing**: Een **AI-native laag** bovenop de bestaande Medusa Admin die natuurlijke taal begrijpt, proactief inzichten geeft en acties voorstelt — zonder de bestaande UI te breken.

**10x Doel**: 50% reductie in tijd die merchants in de admin doorbrengen + NPS admin >75.

### 3.2 Scope v0.5
**In scope**:
- Globale command bar (⌘K + voice) met natuurlijke taal parsing
- 3 high-impact widgets:
  1. Low Margin Products (met AI prijs suggesties)
  2. Supplier Alerts (van Supplier Agent)
  3. Mail Summary (van AETHER Mail)
- AI Sidecar panel (rechts) dat contextueel meedenkt op elke pagina
- LangGraph Operations Agent die commando’s uitvoert via Medusa API + andere agents
- Volledige logging van alle AI acties

**Out of scope v0.5**:
- Volledige voice conversatie (later)
- AR interface (later)
- Custom dashboard builder (later)

### 3.3 Technische Architectuur

```
Medusa Admin (React + Medusa UI)
   ├── Custom Command Bar (shadcn + cmdk)
   ├── AI Sidecar Widget (React + WebSocket)
   └── 3 Custom Widgets (LowMargin, SupplierAlerts, MailSummary)
   ↓
AETHER Admin API (Node.js / FastAPI)
   ├── Natural Language Parser (lokale LLM + tool calling)
   ├── Context Builder (huidige pagina + merchant data)
   └── Action Executor (LangGraph → Medusa API + AETHER Agents)
   ↓
Medusa Core + AETHER Plugins (Mail, Supplier, Pricing, etc.)
```

**Eenvoud principe**: Geen nieuwe database. Alles via bestaande Medusa GraphQL + AETHER event bus.

### 3.4 Voorbeeld Commando’s (die écht werken in v0.5)
- “Toon alle producten met margin onder 25% en stel prijsverhoging van 8% voor”
- “Welke orders hebben >5 dagen geen update?”
- “Samenvatting van alle openstaande mails van deze week”
- “Optimaliseer voorraad voor volgende week op basis van historische sales”
- “Importeer nieuwe producten van leverancier X die deze week in prijs zijn gedaald”

### 3.5 Success Metrics
- % acties via natuurlijke taal: >40%
- Admin NPS: >70
- Gemiddelde tijd per taak: -35%
- Merchant feedback: “Dit voelt als magie”

### 3.6 Implementatie Planning (1.5 sprints)
**Sprint 1 (2 weken)**: Command bar + 2 widgets + basis LangGraph sidecar
**Sprint 1.5 (1 week)**: 3e widget + voice (optioneel) + pilot feedback

**Resources**: 1.5 engineers + 1 AI specialist

---

## Algemene Principes voor alle drie PoCs

1. **Local First**: Waar privacy of security kritiek is → lokale modellen + air-gapped containers.
2. **Human-in-the-Loop by Default**: High-risk acties altijd via proposal + approve.
3. **Radicale Logging**: Alles wat de AI doet is traceerbaar en exporteerbaar.
4. **Merchant Configurable**: Iedere merchant kan granular aan/uit zetten.
5. **Eval-Driven Development**: Geen feature live zonder meetbare metrics + wekelijkse eval.

---

**EINDE VAN DE PoC SPECIFICATIES v1.1**

**Volgende stap**: Sprint planning in Fase 1 — deze drie PoCs parallel starten in week 1 van Q4 2026.

**“Niets is onmogelijk. Durf radicaal te zijn.”**

*Versie 1.1 — 5 mei 2026 — AETHER Core Team*