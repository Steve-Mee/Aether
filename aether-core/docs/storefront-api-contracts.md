# Storefront & Website API Contracts

**Status:** Planned (design)  
**Auth model:** Existing merchant API keys + tenant header for admin; public slug for storefront read  
**Related:** [`storefront-architecture.md`](./storefront-architecture.md)

Conventions:

- JSON request/response; ISO-8601 timestamps; `cuid` IDs  
- Errors: `{ "error": { "code": string, "message": string, "details"?: unknown } }`  
- Roles: `viewer` (GET), `operator` (mutations), publish propose requires `operator`

---

## 1. Admin Website API (`/api/website`)

### 1.1 Create project from brief

`POST /api/website/projects`  
**Role:** operator  
**Feature flag:** `STOREFRONT_BUILDER_ENABLED`

```json
{
  "brief": {
    "prompt": "Handmade keramiek, rustiek, Nederlands",
    "localeDefault": "nl-NL",
    "locales": ["nl-NL"],
    "tone": "warm, craft, calm",
    "audience": "interieurliefhebbers 25-45",
    "mustHavePages": ["home", "collection", "about", "contact", "legal"],
    "brand": {
      "name": "Atelier Noord",
      "primaryColor": "#3D2B1F",
      "accentColor": "#C4A484"
    }
  },
  "slug": "atelier-noord"
}
```

**Response `201`:**

```json
{
  "project": {
    "id": "clx...",
    "tenantId": "t_...",
    "slug": "atelier-noord",
    "status": "draft",
    "createdAt": "2026-07-26T08:00:00.000Z"
  },
  "revision": {
    "id": "clx...",
    "version": 1,
    "status": "generating"
  },
  "buildJob": {
    "id": "clx...",
    "status": "queued"
  }
}
```

### 1.2 Get project

`GET /api/website/projects/:projectId`  
**Role:** viewer

```json
{
  "project": {
    "id": "clx...",
    "slug": "atelier-noord",
    "status": "preview",
    "primaryDomain": null,
    "liveRevisionId": null,
    "latestRevisionId": "clx...",
    "latestPreviewUrl": "https://preview.../r/...",
    "latestQaScore": 0.92
  }
}
```

### 1.3 List projects (tenant)

`GET /api/website/projects`  
**Role:** viewer  

Response: `{ "projects": SiteProjectSummary[] }`

### 1.4 Create revision (iterate)

`POST /api/website/projects/:projectId/revisions`  
**Role:** operator

```json
{
  "parentRevisionId": "clx...",
  "deltaPrompt": "Maak de hero rustiger en voeg een FAQ toe",
  "briefPatch": {
    "tone": "rustiger, minder bold"
  }
}
```

**Response `201`:** `{ "revision": {...}, "buildJob": {...} }`

### 1.5 List revisions

`GET /api/website/projects/:projectId/revisions`  
**Role:** viewer  

```json
{
  "revisions": [
    {
      "id": "clx...",
      "version": 2,
      "createdByAgent": "store_builder",
      "qaScore": 0.91,
      "createdAt": "2026-07-26T09:00:00.000Z",
      "previewUrl": "https://preview.../r/..."
    }
  ]
}
```

### 1.6 Get revision detail

`GET /api/website/revisions/:revisionId`  
**Role:** viewer  

Includes `briefJson`, `planJson`, page summaries, `qaReportJson`, artifact manifest keys (not full blobs).

### 1.7 List pages in revision

`GET /api/website/revisions/:revisionId/pages`  
**Role:** viewer  

```json
{
  "pages": [
    { "id": "clx...", "path": "/", "title": "Home" },
    { "id": "clx...", "path": "/products", "title": "Collectie" },
    { "id": "clx...", "path": "/products/:slug", "title": "Product" },
    { "id": "clx...", "path": "/about", "title": "Over ons" }
  ]
}
```

### 1.8 Get page tree

`GET /api/website/pages/:pageId`  
**Role:** viewer  

```json
{
  "page": {
    "id": "clx...",
    "path": "/",
    "title": "Home",
    "seoJson": {
      "title": "Atelier Noord — Handmade keramiek",
      "description": "...",
      "jsonLd": {}
    },
    "treeJson": {
      "type": "Page",
      "children": [
        { "type": "Hero", "props": { "headline": "...", "ctaLabel": "Shop", "ctaHref": "/products" } },
        { "type": "ProductGrid", "props": { "source": "featured", "limit": 8 } }
      ]
    }
  }
}
```

### 1.9 Trigger build

`POST /api/website/revisions/:revisionId/build`  
**Role:** operator  

**Response `202`:** `{ "buildJob": { "id": "...", "status": "queued" } }`

### 1.10 Get build job

`GET /api/website/builds/:buildId`  
**Role:** viewer  

```json
{
  "buildJob": {
    "id": "clx...",
    "revisionId": "clx...",
    "status": "succeeded",
    "previewUrl": "https://preview.../r/...",
    "logs": "...truncated...",
    "qaReportJson": {
      "score": 0.92,
      "lighthouse": { "performance": 0.95, "accessibility": 0.96, "seo": 0.9 },
      "errors": [],
      "warnings": ["Image Band missing alt on 1 asset"]
    }
  }
}
```

### 1.11 Propose publish

`POST /api/website/revisions/:revisionId/publish`  
**Role:** operator  

Creates approval; does **not** deploy immediately.

```json
{
  "approval": {
    "id": "clx...",
    "type": "PUBLISH_STOREFRONT",
    "status": "pending",
    "payload": {
      "projectId": "clx...",
      "revisionId": "clx...",
      "qaScore": 0.92
    }
  }
}
```

### 1.12 Preview token (optional explicit)

`GET /api/website/preview/:revisionId`  
**Role:** viewer  

```json
{
  "previewUrl": "https://preview.../r/...?token=...",
  "expiresAt": "2026-07-26T10:00:00.000Z"
}
```

### 1.13 Deploy targets

`GET /api/website/projects/:projectId/deploy-target`  
`PUT /api/website/projects/:projectId/deploy-target`  

```json
{
  "deployTarget": {
    "provider": "cloudflare",
    "liveUrl": "https://atelier-noord.aether.shop",
    "configJson": {}
  }
}
```

---

## 2. Public Storefront API (`/api/storefront`)

**Feature flag:** `STOREFRONT_PUBLIC_API_ENABLED`  
**Auth:** none (tenant slug); rate-limited  

### 2.1 Resolve site

`GET /api/storefront/:tenantSlug`  

```json
{
  "site": {
    "slug": "atelier-noord",
    "status": "live",
    "revisionId": "clx...",
    "locales": ["nl-NL"],
    "tokens": { "primary": "#3D2B1F", "accent": "#C4A484" }
  }
}
```

### 2.2 Catalog

`GET /api/storefront/:tenantSlug/catalog?limit=24&cursor=`  

```json
{
  "products": [
    {
      "id": "clx...",
      "slug": "kom-aarde",
      "name": "Kom Aarde",
      "description": "...",
      "price": 42,
      "currency": "EUR",
      "stock": 12,
      "imageUrl": "https://cdn.../..."
    }
  ],
  "nextCursor": null
}
```

### 2.3 Product by slug

`GET /api/storefront/:tenantSlug/products/:slug`  

Includes variants when present.

### 2.4 Page by path

`GET /api/storefront/:tenantSlug/pages?path=/about`  

Returns `seoJson` + `treeJson` from **live** revision (or preview revision if `Authorization: Preview <token>`).

### 2.5 Cart (phase 2 of storefront)

| Method | Path | Body / notes |
|--------|------|--------------|
| `POST` | `/api/storefront/:tenantSlug/carts` | create anonymous cart |
| `GET` | `/api/storefront/:tenantSlug/carts/:cartId` | |
| `POST` | `/api/storefront/:tenantSlug/carts/:cartId/items` | `{ productId, variantId?, quantity }` |
| `PATCH` | `/api/storefront/:tenantSlug/carts/:cartId/items/:itemId` | `{ quantity }` |
| `DELETE` | `/api/storefront/:tenantSlug/carts/:cartId/items/:itemId` | |

### 2.6 Checkout (phase 2)

`POST /api/storefront/:tenantSlug/checkout`  

```json
{
  "cartId": "clx...",
  "customer": { "email": "a@b.c", "firstName": "Ada", "lastName": "Lovelace" },
  "shippingAddress": {},
  "paymentMethod": "stripe"
}
```

**Response:** `{ "orderId", "clientSecret" | "redirectUrl" }` — integrates payment-fulfillment.

---

## 3. Commerce admin API gaps (dashboard dependency)

These extend existing modules; required for full merchant dashboard IA.

### 3.1 Products

| Method | Path | Role | Notes |
|--------|------|------|-------|
| `GET` | `/api/products` | viewer | exists |
| `POST` | `/api/products` | operator | exists |
| `GET` | `/api/products/:id` | viewer | **new** |
| `PATCH` | `/api/products/:id` | operator | **new** |
| `DELETE` | `/api/products/:id` | operator | **new** |
| `GET/POST` | `/api/products/:id/variants` | viewer/operator | **new** |
| `POST` | `/api/products/:id/media` | operator | **new** (upload port) |

### 3.2 Orders

| Method | Path | Role | Notes |
|--------|------|------|-------|
| `GET` | `/api/orders` | viewer | exists |
| `GET` | `/api/orders/:id` | viewer | exists (enrich DTO) |
| `POST` | `/api/orders` | operator | exists |
| `PATCH` | `/api/orders/:id/status` | operator | exists |
| `POST` | `/api/orders/:id/ship` | operator | **new** → may propose if high-risk |
| `POST` | `/api/orders/:id/refunds` | operator | **new** → approval for non-trivial |

### 3.3 Customers

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/customers` | viewer |
| `GET` | `/api/customers/:id` | viewer |
| `GET` | `/api/customers/:id/orders` | viewer |

Wrap/extend `AdminDataPort` customer methods.

### 3.4 Inventory

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/inventory` | viewer |
| `GET` | `/api/inventory/low-stock` | viewer |
| `POST` | `/api/inventory/adjust` | operator |

### 3.5 Promotions

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/promotions` | viewer |
| `POST` | `/api/promotions` | operator (or via PromotionAgent propose) |
| `PATCH` | `/api/promotions/:id` | operator |

### 3.6 Payments (admin)

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/payments/summary` | viewer |
| `GET` | `/api/payments/payouts` | viewer |
| `POST` | `/api/payments/reconcile` | operator | partial exists — expose consistently |

---

## 4. Command Center intents

| Intent | Parser examples (NL) | Side effects | Navigate |
|--------|----------------------|--------------|----------|
| `STORE_BUILD` | “bouw een webshop voor …”, “maak mijn store” | create project + revision | `/website` |
| `STORE_ITERATE` | “maak de hero rustiger”, “voeg FAQ toe” | new revision | `/website/preview` |
| `STORE_PUBLISH` | “publiceer de website”, “zet live” | create approval | `/website/publish` |
| `STORE_STATUS` | “status van mijn website” | read-only summary | `/website` |

Wire into `INTENT_ROUTES` in frontend `routes.ts` when implementing.

---

## 5. Approval action contract

```json
{
  "type": "PUBLISH_STOREFRONT",
  "risk": "high",
  "execute": {
    "port": "DeployPort.deploy",
    "args": { "projectId": "...", "revisionId": "..." }
  },
  "onSuccess": {
    "project.status": "live",
    "project.liveRevisionId": "<revisionId>"
  }
}
```

---

## 6. Error codes (website)

| Code | HTTP | Meaning |
|------|------|---------|
| `WEBSITE_DISABLED` | 403 | Feature flag off |
| `PROJECT_NOT_FOUND` | 404 | |
| `REVISION_NOT_READY` | 409 | Publish/build while generating |
| `QA_BELOW_THRESHOLD` | 422 | Optional gate before propose publish |
| `SLUG_TAKEN` | 409 | Tenant slug conflict |
| `CODEGEN_REJECTED` | 422 | Allowlist/AST failure |
| `DEPLOY_FAILED` | 502 | DeployPort error after approval |

---

## 7. OpenAPI inventory (Wave 16–18) — track closed

**Source of truth (machine specs):**

| Spec | Path | Surface |
|------|------|---------|
| Public storefront | [`backend/openapi/storefront.yaml`](../backend/openapi/storefront.yaml) | `/api/storefront` — site, catalog, pages, cart, checkout |
| Website admin builder | [`backend/openapi/website.yaml`](../backend/openapi/website.yaml) | `/api/website` — projects, revisions, pages (incl. copy), builds, publish, preview, deploy |
| Commerce | [`backend/openapi/commerce.yaml`](../backend/openapi/commerce.yaml) | `/api/{products,orders,customers,promotions,inventory,payments}` — paths + key DTOs |
| Admin command bar | [`backend/openapi/admin.yaml`](../backend/openapi/admin.yaml) | `/api/admin/*` including `/bilateral/audit` — command/overview enriched |
| Platform | [`backend/openapi/platform.yaml`](../backend/openapi/platform.yaml) | auth, media, emails, suppliers, approvals, outcomes, autonomous, plugins, hive-mind, bilateral |

This markdown remains the behavioral source of truth for storefront/website narrative contracts (§1–§2). YAML specs are the machine inventory + drift gate.

**Validate + Express↔OpenAPI path drift:** from `aether-core/backend`, run `npm run openapi:validate` (also in CI).

**Regenerate:** `npm run openapi:generate` (path generators + `openapi:enrich` for commerce/admin/platform DTOs).

**Accepted residual (out of OpenAPI track):**

- Feature-gated experimental mounts: `/api/predictive`, `/api/self-evolving`, `/api/agentic`, `/api/physical`, `/api/co-ownership` (`EXPERIMENTAL_OPENAPI_EXCLUSIONS` in `openapi-route-drift.mjs`)
- Thin schemas on non-agent-critical platform ops (autonomous, plugins, hive-mind, media) and remaining admin surfaces beyond command/overview/bilateral audit
- Dual Lighthouse floors and Prisma migration history (unchanged; see prisma README)
