# SitePlan JSON schema (codegen contract)

**Status:** Implemented (P05 AllowlistCodegenCompiler)  
**Consumers:** DesignAgent / StoreBuilderAgent / CopySeoAgent (P06)  
**Compiler:** `backend/src/modules/storefront-builder/infrastructure/codegen/AllowlistCodegenCompiler.ts`  
**Zod source of truth:** `.../infrastructure/codegen/sitePlanSchema.ts`

Agents must emit a **SitePlan** (plus optional brief). The compiler validates the plan, reject unknown blocks, writes revision artifacts, and persists `SitePage` rows.

---

## 1. SitePlan

```json
{
  "version": 1,
  "localeDefault": "nl-NL",
  "locales": ["nl-NL"],
  "tokens": {
    "primary": "#3D2B1F",
    "accent": "#C4A484",
    "background": "#faf9f7",
    "foreground": "#1a1a1a",
    "muted": "#6b6b6b",
    "colors": {
      "primary": "#3D2B1F",
      "accent": "#C4A484",
      "background": "#faf9f7",
      "foreground": "#1a1a1a",
      "muted": "#6b6b6b"
    },
    "typography": {
      "fontFamily": "Georgia, serif",
      "fontSizeBase": "16px",
      "scale": { "sm": "0.875rem", "lg": "1.25rem" }
    },
    "spacing": { "unit": 8, "section": "4rem" },
    "radius": "0.5rem"
  },
  "copy": {
    "nl-NL": {
      "brandName": "Atelier Noord",
      "homeHeadline": "Handmade keramiek"
    }
  },
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "sortOrder": 0,
      "seo": { "title": "Atelier Noord", "description": "…" },
      "tree": {
        "type": "Page",
        "children": [
          {
            "type": "Hero",
            "props": {
              "headline": "Handmade keramiek",
              "ctaLabel": "Shop",
              "ctaHref": "/products"
            }
          },
          { "type": "ProductGrid", "props": { "source": "featured", "limit": 8 } }
        ]
      }
    }
  ]
}
```

### Rules

| Field | Required | Notes |
|-------|----------|--------|
| `version` | yes (default 1) | Must be `1` |
| `localeDefault` | yes (default `nl-NL`) | BCP-47-ish string |
| `locales` | no | Defaults to `[localeDefault]` for copy emit |
| `tokens` | no | Defaults applied in CSS emit |
| `copy` | no | Emitted as `copy/{lang}.json` (`nl` from `nl-NL`) |
| `pages` | yes (≥1) | Each page has `path` (starts with `/`), `title`, `tree` |
| `overrides` | **forbidden in v1** | Non-empty → `CODEGEN_REJECTED` |

Empty `pages` / missing plan: compiler synthesizes a deterministic default plan from `briefJson` (brand name/colors) so create-project works before agents land.

---

## 2. Page tree

- Root node **must** be `{ "type": "Page", "children": [...] }`.
- Every descendant `type` must be an **allowlisted block** (below).
- Nested `"Page"` nodes are rejected.
- `props` must be plain JSON (string / number / boolean / null / array / object).
- Unknown `type` → `CODEGEN_REJECTED`.

### Allowlisted blocks (charter §4.3)

`Hero`, `LogoBar`, `ProductGrid`, `ProductDetail`, `RichText`, `ImageBand`, `FAQ`, `Testimonials`, `NewsletterSignup`, `Footer`, `Nav`, `CartDrawer`, `CheckoutShell`, `LegalText`, `ContactForm`, `CollectionFilter`, `TrustBadges`

New blocks require design review + runtime registration before agents may emit them.

---

## 3. Artifact layout (emitted)

```
revisions/{revisionId}/
  plan.json
  tokens.json
  tokens.css
  pages/*.tree.json
  copy/*.json
  qa-report.json          # structural build checks (StartBuild / StoreQA runBuildChecks); CWV not measured in Birth
```

**v1 overrides:** not supported. Do not emit `overrides/*.tsx`. If present on SitePlan, compile fails with a clear error (no eval / fs / child_process path).

---

## 4. Error code

API / use-cases surface:

```json
{
  "error": {
    "code": "CODEGEN_REJECTED",
    "message": "…",
    "details": { "issues": […], "allowlistedBlocks": […] }
  }
}
```

HTTP status for admin website routes: `422`.

---

## 5. Handoff to P06

Agents should:

1. DesignAgent → propose `tokens` + `pages[].tree`
2. CopySeoAgent → propose `copy` + `pages[].seo`
3. StoreBuilderAgent → assemble SitePlan `version: 1`, call create revision / compile path
4. Never invent block types; never attach `overrides` until AST allowlist ships
