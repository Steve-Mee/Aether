# AETHER — 30-Dagen Sprint 1 Project Plan

**Periode:** 6 mei – 4 juni 2026  
**Doel:** AETHER Mail v0.5 + AI-Native Admin Command Center v0.5 live met 5 pilot merchants  
**Team:** 8 engineers + 3 AI specialists + 1 product

---

## Week 1 (6 – 12 mei) — Foundation

**Doel:** Volledige setup + eerste werkende versie

| Dag | Taak | Owner | Deliverable |
|-----|------|-------|-------------|
| 6   | Medusa project setup + module registratie | Lead Engineer | Werkend Medusa + AETHER modules |
| 7   | Lokale LLM integratie (Ollama) + basic classificatie | AI Specialist 1 | `local-llm-client.ts` werkend |
| 8   | IMAP polling service + Medusa API endpoint | Backend Engineer 1 | Eerste email verwerkt |
| 9   | Admin Command Bar + Low Margin Widget | Frontend Engineer 1 | Command bar live in Admin |
| 10  | Supplier Alerts Widget + Mail Summary Widget | Frontend Engineer 2 | 3 widgets zichtbaar |
| 11  | Basis approval queue + logging | Backend Engineer 2 | Human review flow werkend |
| 12  | Eerste interne demo + bug fixing | Volledig team | Demo aan core team |

**Deliverable einde Week 1:**  
Werkende AETHER Mail + 3 widgets in Admin. Eerste test met 1 interne merchant.

---

## Week 2 (13 – 19 mei) — Core Features

**Doel:** Volledige functionaliteit + lokale LLM kwaliteit

| Dag | Taak | Owner | Deliverable |
|-----|------|-------|-------------|
| 13  | High-risk vs low-risk logic + confidence thresholds | AI Specialist 2 | >85% accuracy op test set |
| 14  | Context retrieval (Medusa orders + customers) | Backend Engineer 1 | Volledige context in replies |
| 15  | Auto-reply voor low-risk emails | Backend Engineer 2 | 60%+ auto-handled |
| 16  | Eval harness + wekelijkse metrics | Data Scientist | Eval script + dashboard |
| 17  | Supplier Intelligence basis (stub + config UI) | Backend Engineer 3 | Eerste leverancier sync |
| 18  | Performance optimalisatie + error handling | Lead Engineer | <2s response tijd |
| 19  | Interne pilot met 3 merchants | Product | Feedback verzameld |

**Deliverable einde Week 2:**  
AETHER Mail v0.5 functioneel met >70% auto-classificatie. Eerste supplier sync.

---

## Week 3 (20 – 26 mei) — Polish & Pilot

**Doel:** Productie-klaar + 5 pilot merchants live

| Dag | Taak | Owner | Deliverable |
|-----|------|-------|-------------|
| 20  | Air-gapped Docker container + security review | Security Engineer | Zero security incidents |
| 21  | Merchant onboarding flow + settings | Product + Frontend | Self-service onboarding |
| 22  | Documentation + runbook | Tech Writer | Volledige docs |
| 23  | Load testing + scaling prep | DevOps | Klaar voor 100 merchants |
| 24  | Pilot onboarding (5 merchants) | Growth | 5 actieve pilot merchants |
| 25  | Metrics baseline + NPS meting | Data Scientist | Baseline metrics |
| 26  | Sprint review + retrospective | Volledig team | Sprint 1 afgerond |

**Deliverable einde Week 3:**  
5 pilot merchants live. NPS >65. Churn = 0.

---

## Week 4 (27 mei – 4 juni) — Handoff & Sprint 2 Prep

**Doel:** Volledige handoff + Sprint 2 planning

| Dag | Taak | Owner | Deliverable |
|-----|------|-------|-------------|
| 27  | Code review + cleanup | Lead Engineer | Production-ready code |
| 28  | Investor demo voorbereiding | Vision Keeper | 8-minuten live demo klaar |
| 29  | Team onboarding document + cursorrules update | Product | Nieuwe teamleden onboarded |
| 30  | Sprint 2 planning (Supplier Intelligence + Autonomous Operations) | Volledig team | Sprint 2 backlog klaar |
| 31  | Maandelijkse investor update | Vision Keeper | Eerste update verstuurd |
| 1-4 | Buffer + bug fixing | Team | Alles stabiel |

**Deliverable einde Week 4:**  
Sprint 1 volledig afgerond. Klaar voor Sprint 2. Eerste investor update verstuurd.

---

## Key Metrics (Einde Sprint 1)

- **AETHER Mail accuracy:** >82%
- **Auto-handled emails:** >65%
- **Admin NPS:** >70
- **Pilot merchants:** 5
- **Time saved per merchant:** >4 uur/week
- **Uplift (early signal):** >12%

---

## Risico’s & Mitigatie

- **Lokale LLM kwaliteit** → Wekelijkse eval + human approval gates
- **IMAP betrouwbaarheid** → Retry logic + fallback naar webhook
- **Merchant adoptie** → Persoonlijke onboarding + money-back garantie

---

**Laten we gaan bouwen.**  
**Merchant Success First. Local AI First.**