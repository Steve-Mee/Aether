## Summary

<!-- What changed and why? Keep it to 1–3 sentences. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor / chore
- [ ] Docs / CI only

## Affected area

- [ ] `aether-core/frontend`
- [ ] `aether-core/backend`
- [ ] Both
- [ ] Docs / workflows only

## Pre-merge checklist

- [ ] CI passes (`backend` + `frontend` jobs)
- [ ] Ran local checks (see below)
- [ ] No secrets or `.env` files committed
- [ ] Visual snapshots updated if UI changed (`npm run test:visual:update`)
- [ ] Truth matrix / feature status updated if behavior or claims changed

## Local checks

**Frontend:**
```bash
cd aether-core/frontend
npm run verify:ci          # fast gates (lint, test, build, audit)
npm run verify:ci:e2e      # + Playwright (if UI/routing changed)
```

**Backend:**
```bash
cd aether-core/backend
npm run lint && npm test && npm run build
```

## Screenshots / recordings

<!-- Optional — especially helpful for UI changes. -->

## Notes for reviewers

<!-- Anything non-obvious: trade-offs, follow-ups, manual test steps. -->
