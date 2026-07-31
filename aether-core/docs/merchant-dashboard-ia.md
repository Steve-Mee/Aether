# Merchant Dashboard — Information Architecture

**Status:** Planned (design) for commerce/website expansions; existing ops routes are live  
**Frontend:** `aether-core/frontend` (Vite + React — extend, do not replace)  
**API mapping:** [`storefront-api-contracts.md`](./storefront-api-contracts.md)  
**Website department:** [`../../project-dna/Aether/storefront-builder.md`](../../project-dna/Aether/storefront-builder.md)

---

## 1. Design principles

1. **Command Center remains primary** — NL + AI sidecar for daily control.
2. **Deep modules for precision** — full commerce CRUD when the merchant needs the table/form.
3. **AI-assisted, not AI-hidden** — every heavy mutation shows agent provenance + approval when high-risk.
4. **Calm progressive disclosure** — overview → list → detail; no dashboard soup in the first viewport of deep pages.
5. **Truth badges** — feature status from `/api/admin/truth-status`; never hardcode “live” for planned modules.

---

## 2. Navigation groups

Update `minimalNavItems` / sidebar to group routes (labels via i18n keys):

| Group | Routes |
|-------|--------|
| **Home** | `/command-center`, `/overview`, `/workstream`, `/goals` |
| **Commerce** | `/products`, `/orders`, `/customers`, `/inventory`, `/promotions`, `/payments` |
| **Website** | `/website`, `/website/brief`, `/website/preview`, `/website/pages`, `/website/publish`, `/pages` |
| **Operations** | `/approvals`, `/emails`, `/suppliers`, `/negotiations`, `/notifications`, `/timeline` |
| **Intelligence** | `/agents`, `/insights`, `/outcomes`, `/autonomous` |
| **Settings** | `/settings` |

Deep modules use `layout: 'deep'` + rail sidebar (existing pattern in `routes.ts`).

---

## 3. Full route catalog

| Route | State | Purpose |
|-------|-------|---------|
| `/command-center` | Live | NL commands |
| `/overview` | Live | KPI + attention |
| `/workstream` | Live | Today’s tasks |
| `/goals`, `/goals/:id` | Live | Goals |
| `/approvals` | Live | HITL queue |
| `/insights` | Live | AI insights |
| `/agents` | Live | Agent roster |
| `/timeline` | Live | Activity |
| `/notifications` | Live | Alerts |
| `/emails` | Live | AETHER Mail |
| `/suppliers` | Live | Supplier intel |
| `/negotiations` | Live | Agentic commerce |
| `/outcomes` | Live/partial | Attribution |
| `/autonomous` | Live | Autonomy metrics |
| `/settings` | Live | 11 settings sections |
| `/products` | Live (list) | Catalog list |
| `/products/new` | **Planned** | Create product |
| `/products/:id` | **Planned** | Product detail/edit |
| `/orders` | Live (list) | Order list |
| `/orders/:id` | **Planned** | Order detail/fulfillment |
| `/customers` | **Planned** | Customer list |
| `/customers/:id` | **Planned** | Customer detail |
| `/inventory` | **Planned** | Stock management |
| `/promotions` | **Planned** | Campaigns / discounts |
| `/payments` | **Planned** | Payouts / reconciliation |
| `/website` | **Planned** | Store project hub |
| `/website/brief` | **Planned** | Brief editor |
| `/website/preview` | **Planned** | Preview + iterate |
| `/website/pages` | **Planned** | Page tree |
| `/website/publish` | **Planned** | Diff + publish |
| `/pages` | **Planned** | CMS mirror of site pages |

---

## 4. Text wireframes

### 4.1 `/products` (enhance existing)

```
┌──────────────────────────────────────────────────────────┐
│ Products                          [Importeer] [+ Nieuw]  │
│ filters: status ▾  stock ▾  search ________              │
├──────────────────────────────────────────────────────────┤
│ Name           Price    Stock   Status    Updated        │
│ Kom Aarde      €42      12      active    …     →        │
│ …                                                        │
│ empty: “Nog geen producten — of vraag het Command Center”│
└──────────────────────────────────────────────────────────┘
```

**API:** `GET /api/products`  
**Commands:** `LOW_MARGIN_REPORT`, `PRICE_UPDATE`, catalog propose create

### 4.2 `/products/:id`

```
┌──────────────────────────────────────────────────────────┐
│ ← Products / Kom Aarde              [Opslaan] [Archiveer]│
│ tabs: Algemeen | Varianten | Media | SEO | Voorraad | Log│
├──────────────────────────────────────────────────────────┤
│ Algemeen: name, slug, description, status, category      │
│ Varianten: SKU table + add row                           │
│ Media: grid + upload                                     │
│ SEO: title, description, preview snippet                 │
│ Voorraad: aggregate + per variant                        │
│ Log: CatalogAgent proposals / approvals                  │
└──────────────────────────────────────────────────────────┘
```

**API:** `GET/PATCH /api/products/:id`, variants, media  
**Sidecar boost:** margin / catalog

### 4.3 `/orders`

```
┌──────────────────────────────────────────────────────────┐
│ Orders     pipeline: All | Pending | Paid | Shipped | …  │
│ search order id / email                                  │
├──────────────────────────────────────────────────────────┤
│ #    Customer     Total    Status    Created             │
│ …                                                        │
└──────────────────────────────────────────────────────────┘
```

**API:** `GET /api/orders`

### 4.4 `/orders/:id`

```
┌──────────────────────────────────────────────────────────┐
│ ← Orders / ORD-…                                         │
│ Status chip + actions: Mark paid | Ship | Cancel | Refund│
├──────────────┬───────────────────────────────────────────┤
│ Customer     │ Line items                                │
│ email, name  │ product, qty, price                       │
│              │                                           │
│ Payment      │ Fulfillment                               │
│ method, id   │ tracking, carrier                         │
│              │                                           │
│ Timeline     │ agent/system events                       │
└──────────────┴───────────────────────────────────────────┘
```

**API:** `GET /api/orders/:id`, status, ship, refunds (approval when needed)

### 4.5 `/customers`

```
┌──────────────────────────────────────────────────────────┐
│ Customers              segments: All | VIP | At risk     │
│ table: name, email, orders, LTV, last order              │
└──────────────────────────────────────────────────────────┘
```

**API:** `GET /api/customers` (+ segments via AdminDataPort)

### 4.6 `/customers/:id`

```
┌──────────────────────────────────────────────────────────┐
│ Customer: Ada L. <a@b.c>                                 │
│ KPIs: orders | LTV | last active                         │
│ Orders list → /orders/:id                                │
│ Notes (optional) + churn signals from CustomerInsights   │
└──────────────────────────────────────────────────────────┘
```

### 4.7 `/inventory`

```
┌──────────────────────────────────────────────────────────┐
│ Inventory                         [Restock voorstellen]  │
│ low-stock banner (count)                                 │
│ SKU | Product | Stock | Threshold | Status               │
│ drawer: RESTOCK_SUGGEST proposals → Approvals            │
└──────────────────────────────────────────────────────────┘
```

**API:** `/api/inventory`, `/api/inventory/low-stock`, adjust

### 4.8 `/promotions`

```
┌──────────────────────────────────────────────────────────┐
│ Promotions                           [+ Via AI voorstel] │
│ Name | Type | Status | Window | Uplift (if any)          │
└──────────────────────────────────────────────────────────┘
```

**API:** `/api/promotions` · PromotionAgent tools

### 4.9 `/payments`

```
┌──────────────────────────────────────────────────────────┐
│ Payments                                                 │
│ Connect status | balance | failed payments               │
│ Payouts table | Reconcile action                         │
└──────────────────────────────────────────────────────────┘
```

**API:** `/api/payments/*` (align payment-fulfillment)

### 4.10 `/website` hub

```
┌──────────────────────────────────────────────────────────┐
│ Website          status: preview ●    [Nieuwe versie]    │
├────────────────────────────┬─────────────────────────────┤
│ Latest revision v2         │ StoreBuilder activity       │
│ QA 0.92  Preview ↗         │ “Hero simplified…”          │
│ Brief snippet              │                             │
├────────────────────────────┴─────────────────────────────┤
│ empty state: single prompt “Wat wil je verkopen?”        │
└──────────────────────────────────────────────────────────┘
```

**API:** `GET /api/website/projects`, create project

### 4.11 `/website/brief`

```
┌──────────────────────────────────────────────────────────┐
│ Brief                                                    │
│ prompt (textarea) | tone | audience | locales            │
│ brand colors | must-have pages checklist                 │
│ [Opslaan & genereer]                                     │
└──────────────────────────────────────────────────────────┘
```

### 4.12 `/website/preview`

```
┌────────────────────────────┬─────────────────────────────┐
│ iframe preview             │ Changelog / agent notes     │
│                            │ Iterate chip: ________      │
│ device: Desktop Mobile     │ [Rebuild]                   │
└────────────────────────────┴─────────────────────────────┘
```

### 4.13 `/website/pages` and `/pages`

Same page tree; `/pages` is CMS-oriented entry (commerce nav), `/website/pages` is website-department entry. Editing copy opens iterate (`STORE_ITERATE`), not raw HTML by default. Advanced: inspect `treeJson` block props.

### 4.14 `/website/publish`

```
┌──────────────────────────────────────────────────────────┐
│ Publish                                                  │
│ Diff vLive ← v2 (pages changed, tokens, copy)            │
│ QA report summary                                        │
│ [Vraag goedkeuring] → creates PUBLISH_STOREFRONT         │
│ deep link to /approvals                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Page → API mapping (summary)

| Page | Primary APIs |
|------|----------------|
| Products list/detail | `/api/products` (+ id, variants, media) |
| Orders list/detail | `/api/orders` (+ ship, refunds) |
| Customers | `/api/customers` |
| Inventory | `/api/inventory` |
| Promotions | `/api/promotions` |
| Payments | `/api/payments/*` |
| Website * | `/api/website/*` |
| Approvals | `/api/approvals` |
| Command Center | `/api/admin/command` |

---

## 6. Data model gaps (dashboard + storefront)

| Model / fields | Why |
|----------------|-----|
| Product: images[], seoTitle, seoDescription, categoryId | PDP + SEO |
| Category | Navigation / filters |
| Cart, CartItem | Public checkout |
| Shipment | Fulfillment UI |
| Refund | Refund UI + approvals |
| Promotion | Promotions page |
| SiteProject, SiteRevision, SitePage, SiteAsset, BuildJob, DeployTarget | Website |
| MediaAsset | Shared uploads |

---

## 7. Frontend implementation notes

- Register new routes in `src/lib/navigation/routes.ts` with `RouteModule` extensions.
- Reuse `ModulePageLayout`, `AsyncBoundary`, feature gates.
- Extend `INTENT_ROUTES` / `SIDECAR_BOOST_BY_PATH` for website + customers + inventory.
- Empty states always offer a Command Center affordance.
- Feature keys: `storefront-builder`, `storefront-public-api`, `merchant-dashboard-commerce-ui` (partial with E2E/UI evidence; not pilot-complete).

---

## 8. Build priority for UI

1. `/products/:id` + `/products/new`  
2. `/orders/:id`  
3. `/website` + `/website/preview` (depends on website APIs)  
4. `/customers` + `/customers/:id`  
5. `/inventory`  
6. `/website/publish` + approvals wiring  
7. `/promotions`, `/payments`, `/pages`  

---

## 9. Explicit non-goals (v1 dashboard)

- Replacing Command Center with a Shopify-clone sidebar-first UX  
- Merchant editing production storefront source outside allowlisted trees  
- Full BI/reporting suite (use Overview + Outcomes first)  
- Multi-store franchising UI
