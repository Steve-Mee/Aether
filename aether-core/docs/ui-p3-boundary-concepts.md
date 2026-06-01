# P3 — 10x Boundary-Pushing UI Concepts

**Interaction contracts voor differentiatie**  
**Version:** 1.0 | **Date:** 2026-06-01

---

## P3.1 Zero-Click Optimization Windows

### Probleem
Merchant initieert nog te veel handmatig. Autonomie zonder initiatief is halve belofte.

### Concept
Tijdvensters (bijv. 02:00–06:00 merchant-local) waarin AETHER low-risk optimalisaties autonoom uitvoert:

- Prijs micro-adjustments (<3%) binnen margin guardrails
- Stock reorder suggestions → auto-execute onder drempel
- Mail auto-replies voor FAQ-categorieën

### UI contract

```typescript
interface OptimizationWindow {
  id: string;
  schedule: { startHour: number; endHour: number; timezone: string };
  allowedActions: ActionType[];
  maxRiskBand: 'low' | 'medium';
  postFactDigest: boolean; // merchant krijgt samenvatting, geen pre-approval
}

interface OptimizationDigest {
  windowId: string;
  executedCount: number;
  skippedCount: number;
  estimatedUplift: number;
  items: Array<{ action: string; entityId: string; explainUrl: string }>;
}
```

### Merchant experience
- Ochtend: "AETHER voerde 8 optimalisaties uit vannacht — +€142 geschat. [Bekijk digest]"
- Één-klik rollback per item of bulk undo

---

## P3.2 Outcome Cockpit — Causal Layer

### Probleem
Metrics tonen *wat*; outcome-pricing vereist *waarom* met holdout-bewijs.

### Concept
Live causal graph per beslissing:

```typescript
interface CausalNode {
  decisionId: string;
  treatment: 'ai_optimized' | 'control_holdout';
  uplift: { point: number; confidenceLow: number; confidenceHigh: number };
  holdoutActive: boolean;
  evidenceLinks: string[];
}
```

### UI surfaces
- **DecisionCard** uitbreiding: causal band visualization
- **Outcomes page**: graph view (decision → outcome chain)
- Badge: "Holdout actief — 12% traffic control"

### Acceptatie
Merchant kan in <10s uitleggen waarom hij AETHER vertrouwt voor billing.

---

## P3.3 Ambient Intelligence UI

### Probleem
Interface voelt nog als tool, niet als operating system.

### Concept
Adaptive density op basis van merchant gedrag:

| Modus | Trigger | UI |
|-------|---------|-----|
| Brief | Open app, <5s sessie | "20s briefing" card: approvals, uplift, 1 actie |
| Focus | Actief in approvals | Minimal chrome, sidecar collapsed |
| Explore | >3 commands/sessie | Expanded suggestions, hive insights |

### UI contract

```typescript
interface AmbientBrief {
  durationSeconds: 20;
  sections: Array<{ title: string; summary: string; primaryAction?: ActionRef }>;
}

interface DensityMode { mode: 'brief' | 'focus' | 'explore'; reason: string }
```

### "Brief me in 20s"
Voice of tap → AI leest/samenvat: pending items, overnight changes, recommended next action.

---

## P3.4 AR-Ready Operations Overlays

### Probleem
AR in roadmap Fase 3–4; zonder UI-contracts = rewrite later.

### Interaction contracts (device-agnostic)

```typescript
/** Spatial anchor — later mapped to AR frame or smart shelf ID */
interface SpatialAnchor {
  anchorId: string;
  type: 'product' | 'shelf' | 'fulfillment_bin';
  entityId: string;
  metadata: Record<string, unknown>;
}

/** Overlay action — same handler for 2D fallback and AR */
interface OverlayAction {
  anchor: SpatialAnchor;
  label: string;
  intent: string; // routes to Command OS
  preview?: { price?: number; stock?: number; imageUrl?: string };
}

interface ARSessionConfig {
  enabled: boolean;
  fallback2D: boolean; // always true until AR device present
  overlays: OverlayAction[];
}
```

### 2D fallback (nu)
- Product detail: "View in space" → placeholder met spatial preview mock
- Supplier shelf sync: QR scan → same `OverlayAction` handler

### AR plug-in (later)
- Replace renderer; keep `OverlayAction` + `SpatialAnchor` contracts
- Voice: "Heb je dit in maat L?" → highlight shelf (Smart Shelf v3)

---

## Implementatievolgorde

1. **P3.1** — Backend policy engine + digest API → UI digest card
2. **P3.2** — Holdout data in Outcomes page
3. **P3.3** — Ambient brief on cockpit open
4. **P3.4** — SpatialAnchor types in shared package; 2D fallback buttons

---

## Definition of Done (P3)

- Merchant ervaart AETHER als initiatief nemend, niet wachtend
- Causal trust is visueel en verifieerbaar
- Interface past zich aan zonder configuratie
- AR is plug-in, geen rewrite
