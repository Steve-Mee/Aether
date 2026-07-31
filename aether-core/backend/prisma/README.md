# Prisma — schema & migrations

## Workflow

| Context | Commands |
|---------|----------|
| Local schema check | `npm run prisma:validate` |
| Local migrate (dev) | `npm run prisma:migrate` (`prisma migrate dev`) |
| Generate client | `npm run prisma:generate` |
| Seed | `npm run prisma:seed` |
| CI | `prisma validate` → `migrate deploy` → `generate` (see `.github/workflows/ci.yml`) |

Optional human check: `npx prisma migrate status`.

## Naming

Folders: `YYYYMMDDHHMMSS_snake_case` (example: `20260726120000_storefront_builder`).

**53** migration folders under `migrations/` (+ `migration_lock.toml`).

## Storefront migrations (not duplicates)

Sequential complements:

1. `20260726120000_storefront_builder` — site/catalog/cart schema
2. `20260726140000_storefront_checkout_idempotency` — checkout idempotency
3. Later: `20260729180000_redis_spill` (related ops, not a storefront dupe)

## Same-second timestamp collisions

Distinct folders can share the same `YYYYMMDDHHMMSS` prefix. Prisma sorts by **full folder name**. Known cases (observe-only):

- `20260708120000` ×2
- `20260709120000` ×2
- `20260710120000` ×3

**Never rename, squash, or reorder applied migrations.** Fix forward with new migrations only.
