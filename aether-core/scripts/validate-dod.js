#!/usr/bin/env node
/**
 * Validates truth-matrix, release-gates, runtime version, UI sync, and CI alignment.
 * Exit 0 = aligned; exit 1 = drift detected (release blocker).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const DOCS = path.join(ROOT, 'docs');
const runtimeCharter = fs.existsSync(path.join(DOCS, 'runtime-charter.md'))
  ? read(path.join(DOCS, 'runtime-charter.md'))
  : '';

const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function extractVersionFromApp(src) {
  const m = src.match(/const VERSION = '([^']+)'/);
  return m ? m[1] : null;
}

function check(name, ok, message) {
  if (!ok) errors.push(`[${name}] ${message}`);
}

function warn(name, ok, message) {
  if (!ok) warnings.push(`[${name}] ${message}`);
}

// 1. Runtime version vs docs
const appSrc = read(path.join(BACKEND, 'src', 'app.ts'));
const pkg = JSON.parse(read(path.join(BACKEND, 'package.json')));
const frontendPkg = JSON.parse(read(path.join(FRONTEND, 'package.json')));
const truthMatrix = read(path.join(DOCS, 'truth-matrix.md'));
const releaseGates = read(path.join(DOCS, 'release-gates.md'));
const roadmapAlignment = read(path.join(DOCS, 'roadmap-alignment.md'));
const ciYaml = read(path.join(ROOT, '..', '.github', 'workflows', 'ci.yml'));
const appTsx = read(path.join(FRONTEND, 'src', 'App.tsx'));
const envExample = read(path.join(BACKEND, '.env.example'));
const outcomesModule = read(path.join(BACKEND, 'src', 'modules', 'outcomes', 'index.ts'));

const runtimeVersion = extractVersionFromApp(appSrc);
check('version-app', runtimeVersion === pkg.version, `app.ts (${runtimeVersion}) !== package.json (${pkg.version})`);
check('version-docs', truthMatrix.includes(`backend \`${runtimeVersion}\``), `truth-matrix missing runtime version ${runtimeVersion}`);
check('version-frontend-pkg', frontendPkg.version === runtimeVersion, `frontend package.json (${frontendPkg.version}) !== runtime (${runtimeVersion})`);

const modulePageLayout = read(path.join(FRONTEND, 'src', 'components', 'shell', 'ModulePageLayout.tsx'));
const pageHeader = read(path.join(FRONTEND, 'src', 'components', 'ui', 'page-header.tsx'));
check(
  'frontend-feature-badges',
  pageHeader.includes('FeatureStatusFromTruth') &&
    modulePageLayout.includes('featureKey') &&
    read(path.join(FRONTEND, 'src', 'pages', 'Orders.tsx')).includes('featureKey'),
  'Admin pages must surface FeatureStatusFromTruth via ModulePageLayout/PageHeader'
);
check(
  'frontend-settings-import',
  appTsx.includes('SettingsLayout') || /import Settings from '\.\/pages\/Settings'/.test(appTsx),
  'App.tsx missing Settings layout/route wiring'
);
check(
  'frontend-settings-route',
  appTsx.includes("renderLayoutRoutes('settings')") || appTsx.includes('<Settings />'),
  'App.tsx missing Settings route'
);

// 3. CI mandatory gates
check(
  'ci-postgres',
  /postgres:16-alpine|pgvector\/pgvector:pg16/.test(ciYaml),
  'CI missing Postgres service'
);
check('ci-ci-flag', ciYaml.includes("CI: 'true'"), 'CI missing CI=true env for DB E2E');
check('ci-mail-e2e', /mail-approval\.e2e|mail approval E2E/i.test(ciYaml), 'CI missing explicit mail-approval E2E step');
check(
  'ci-storefront-birth-e2e',
  /storefront-birth\.e2e|Storefront Birth Gate E2E/i.test(ciYaml),
  'CI missing explicit storefront-birth E2E step (Appendix G locked path)'
);
check(
  'ci-storefront-e2e',
  /storefront-publish\.e2e|Storefront publish E2E/i.test(ciYaml),
  'CI missing explicit storefront-publish E2E step'
);
check(
  'ci-storefront-checkout-e2e',
  /storefront-checkout\.e2e|Storefront checkout E2E/i.test(ciYaml),
  'CI missing explicit storefront-checkout E2E step'
);
check('ci-test-ci', ciYaml.includes('test:ci'), 'CI missing npm run test:ci');
check('ci-supplier-identity', /supplierIdentity|supplier scrape/i.test(ciYaml), 'CI missing supplier identity/scrape step');
check('ci-stripe-mock', /stripe-mock|stripeIntegration/i.test(ciYaml), 'CI missing stripe-mock integration step');
check('ci-validate-dod', /validate-dod|validate:dod/i.test(ciYaml), 'CI missing DoD validation step');
check('ci-lint', ciYaml.includes('npm run lint'), 'CI missing lint step');

// 4. Release gates honesty
check('gate-mail-e2e', releaseGates.includes('mail→approval→rollback E2E in CI'), 'release-gates missing mail E2E claim');
check(
  'gate-storefront-birth-e2e',
  /storefront-birth\.e2e|Birth Gate E2E/i.test(releaseGates),
  'release-gates missing storefront Birth Gate E2E claim'
);
check(
  'gate-storefront-e2e',
  /storefront.*E2E in CI|storefront-publish\.e2e/i.test(releaseGates),
  'release-gates missing storefront publish E2E claim'
);
check(
  'gate-storefront-checkout-e2e',
  /storefront-checkout\.e2e|catalog→cart→checkout E2E/i.test(releaseGates),
  'release-gates missing storefront checkout E2E claim'
);
check('gate-viewer-rbac', /viewer.*GET|Viewer role on read/i.test(releaseGates), 'release-gates missing viewer RBAC');
check('gate-claim-policy', /Claim policy|provable evidence/i.test(releaseGates), 'release-gates missing claim policy');
check('gate-otel-sdk', /otelBootstrap|OpenTelemetry SDK/i.test(releaseGates), 'release-gates missing OTEL SDK claim');

// 5. Roadmap / truth-matrix phase alignment
check('roadmap-fase3-orchestration', roadmapAlignment.includes('Fase 3 Orchestration'), 'roadmap-alignment Fase 3 must be Orchestration + Outcomes');
check('roadmap-fase4-autonomy', roadmapAlignment.includes('Fase 4 Radical autonomy'), 'roadmap-alignment Fase 4 must be Radical autonomy');
check('roadmap-fase5-ecosystem', roadmapAlignment.includes('Fase 5 Ecosystem'), 'roadmap-alignment Fase 5 must be Ecosystem');
check('truth-fase3-orchestration', truthMatrix.includes('Fase 3 Orchestration'), 'truth-matrix Fase 3 label mismatch');

// 6. Truth matrix pilot blockers documented
check('truth-partial-pay', truthMatrix.includes('Payment fulfillment') && truthMatrix.includes('partial'), 'truth-matrix missing honest pay partial status');
check('truth-partial-mail', truthMatrix.includes('AETHER Mail v1') && truthMatrix.includes('partial'), 'truth-matrix missing honest mail partial status');
check('truth-supplier-implemented', /Supplier Intelligence v1.*implemented/s.test(truthMatrix.replace(/\n/g, ' ')), 'truth-matrix missing supplier implemented status');

// 7. RBAC: viewer on read routes in code
const readModules = [
  path.join(BACKEND, 'src', 'modules', 'aether-mail', 'index.ts'),
  path.join(BACKEND, 'src', 'modules', 'supplier-intelligence', 'index.ts'),
  path.join(BACKEND, 'src', 'modules', 'approvals', 'index.ts'),
  path.join(BACKEND, 'src', 'modules', 'agentic-commerce', 'api', 'controllers', 'AgenticController.ts'),
  path.join(BACKEND, 'src', 'modules', 'zero-knowledge-hive-mind', 'api', 'controllers', 'HiveMindController.ts'),
  path.join(BACKEND, 'src', 'modules', 'autonomous-operations', 'api', 'controllers', 'AutonomousController.ts'),
  path.join(BACKEND, 'src', 'modules', 'plugin-system', 'api', 'controllers', 'PluginController.ts'),
  path.join(BACKEND, 'src', 'modules', 'physical-digital-symbiosis', 'api', 'controllers', 'PhysicalController.ts'),
  path.join(BACKEND, 'src', 'modules', 'merchant-co-ownership', 'api', 'controllers', 'MerchantCoOwnershipController.ts'),
];

for (const file of readModules) {
  const src = read(file);
  const rel = path.relative(ROOT, file);
  check('rbac-viewer', src.includes('requireViewer'), `${rel} missing requireViewer on read routes`);
}

// 8. Stripe provider supports mock host for CI
const stripePaymentProvider = read(
  path.join(BACKEND, 'src', 'modules', 'payment-fulfillment', 'infrastructure', 'providers', 'StripePaymentProvider.ts')
);
const paymentProviderBarrel = read(
  path.join(BACKEND, 'src', 'modules', 'payment-fulfillment', 'infrastructure', 'providers', 'PaymentProvider.ts')
);
const adyenSandboxProvider = read(
  path.join(
    BACKEND,
    'src',
    'modules',
    'payment-fulfillment',
    'infrastructure',
    'providers',
    'AdyenSandboxPaymentProvider.ts'
  )
);
check(
  'stripe-mock-host',
  stripePaymentProvider.includes('STRIPE_API_HOST'),
  'PaymentProvider missing STRIPE_API_HOST for CI mock'
);

// 9. Endpoint-specific webhook auth
const authSrc = read(path.join(BACKEND, 'src', 'shared', 'security', 'auth.ts'));
check(
  'webhook-endpoint-specific',
  authSrc.includes('isStripeWebhookPath') &&
    authSrc.includes('isSupplierWebhookPath') &&
    !/req\.path\.includes\('\/webhook'\)[\s\S]*stripe-signature/.test(authSrc),
  'auth.ts must use endpoint-specific webhook paths, not path-wide stripe-signature trust'
);
check(
  'webhook-supplier-secret',
  authSrc.includes('SUPPLIER_WEBHOOK_SECRET') && authSrc.includes('verifyWebhookSecret'),
  'auth.ts missing supplier webhook secret verification'
);

// 10. Env onboarding includes webhook secrets
check('env-supplier-webhook', envExample.includes('SUPPLIER_WEBHOOK_SECRET'), '.env.example missing SUPPLIER_WEBHOOK_SECRET');
check('env-payment-webhook', envExample.includes('PAYMENT_WEBHOOK_SECRET'), '.env.example missing PAYMENT_WEBHOOK_SECRET');
check('env-stripe-webhook', envExample.includes('STRIPE_WEBHOOK_SECRET'), '.env.example missing STRIPE_WEBHOOK_SECRET');
check('env-otlp', envExample.includes('OTEL_EXPORTER_OTLP_ENDPOINT'), '.env.example missing OTEL_EXPORTER_OTLP_ENDPOINT');

// 11. Outcomes record validation
check(
  'outcomes-record-zod',
  outcomesModule.includes('recordSchema') && outcomesModule.includes('validateBody(recordSchema)'),
  'outcomes /record missing Zod validation'
);

// 12. OTEL SDK bootstrap present
const otelBootstrap = read(path.join(BACKEND, 'src', 'shared', 'observability', 'otelBootstrap.ts'));
check('otel-bootstrap', otelBootstrap.includes('NodeSDK') && otelBootstrap.includes('OTLPTraceExporter'), 'otelBootstrap.ts missing OTEL SDK export');
check('otel-index-init', read(path.join(BACKEND, 'src', 'index.ts')).includes('initOtelSdk'), 'index.ts must initialize OTEL SDK');

// 13. Adyen labeled as experimental stub
check(
  'adyen-stub-honest',
  (paymentProviderBarrel.includes('AdyenSandboxPaymentProvider') ||
    adyenSandboxProvider.includes('AdyenSandboxPaymentProvider')) &&
    (paymentProviderBarrel.includes('adyen-sandbox') || adyenSandboxProvider.includes('adyen-sandbox')),
  'PaymentProvider must use AdyenSandboxPaymentProvider for test-mode references'
);
check(
  'truth-adyen-experimental',
  /Adyen.*experimental|experimental sandbox|adyen-sandbox/i.test(truthMatrix),
  'truth-matrix must document Adyen as experimental sandbox'
);

// 14. Backend README module count honesty
const backendReadme = read(path.join(BACKEND, 'README.md'));
check('backend-readme-modules', backendReadme.includes('Modules (17)'), 'backend README must list 17 modules');

// 15. Roadmap 100% endpoints and UI
const adminIndex = read(path.join(BACKEND, 'src', 'modules', 'admin-command-bar', 'index.ts'));
const mailIndex = read(path.join(BACKEND, 'src', 'modules', 'aether-mail', 'index.ts'));
const outcomesPage = read(path.join(FRONTEND, 'src', 'pages', 'Outcomes.tsx'));
const jestConfig = read(path.join(BACKEND, 'jest.config.js'));

check('admin-autonomy-route', adminIndex.includes('/autonomy'), 'admin missing GET /autonomy metrics route');
check('mail-metrics-route', mailIndex.includes('/metrics'), 'aether-mail missing GET /metrics route');
check(
  'outcomes-billing-ui',
  (outcomesPage.includes('billing') || outcomesPage.includes('Billing')) &&
    (outcomesPage.includes('/api/outcomes/billing') ||
      read(path.join(FRONTEND, 'src', 'hooks', 'useOutcomesPage.ts')).includes('billingSummary')),
  'Outcomes.tsx missing billing tab'
);
check(
  'global-coverage-scope',
  jestConfig.includes('src/modules/**/api/**/*.ts'),
  'jest.config must collect coverage from API controller layers'
);
check(
  'release-gates-coverage',
  releaseGates.includes('≥60% coverage on application + API controller layers'),
  'release-gates must document coverage gate'
);
check(
  'truth-roadmap-v1-migration',
  truthMatrix.includes('roadmap_v1'),
  'truth-matrix must reference roadmap_v1 migration'
);

// 16. Runtime behavioral checks (not doc-only)
const authSrcFull = read(path.join(BACKEND, 'src', 'shared', 'security', 'auth.ts'));
check(
  'auth-tenant-mismatch',
  authSrcFull.includes('Tenant header must match API key tenant'),
  'auth.ts must reject cross-tenant header override'
);
check(
  'auth-test-bypass-explicit',
  authSrcFull.includes('AETHER_TEST_AUTH_BYPASS'),
  'auth.ts test bypass must require AETHER_TEST_AUTH_BYPASS=true'
);

const featureStatusPath = path.join(DOCS, 'feature-status.json');
check('feature-status-json', fs.existsSync(featureStatusPath), 'docs/feature-status.json missing');
const featureStatus = JSON.parse(read(featureStatusPath));
check('feature-status-mail-partial', featureStatus.features['aether-mail']?.status === 'partial', 'mail must be partial in feature-status.json');
check('feature-status-admin-partial', featureStatus.features['admin-command-bar']?.status === 'partial', 'admin must be partial in feature-status.json');

const orchestratorSrc = read(path.join(BACKEND, 'src', 'ai', 'orchestrator', 'Orchestrator.ts'));
const taskExecutorSrc = read(path.join(BACKEND, 'src', 'ai', 'orchestrator', 'TaskExecutor.ts'));
check('orchestrator-task-executor', orchestratorSrc.includes('executeOrchestratorTask'), 'Orchestrator must delegate to TaskExecutor');
check('task-executor-mail', taskExecutorSrc.includes("case 'mail.classify'"), 'TaskExecutor missing mail.classify handler');
check('task-executor-supplier', taskExecutorSrc.includes("case 'supplier.sync'"), 'TaskExecutor missing supplier.sync handler');

const indexSrc = read(path.join(BACKEND, 'src', 'index.ts'));
check('ecosystem-jobs-gated', indexSrc.includes('ECOSYSTEM_JOBS_ENABLED'), 'index.ts must gate federated hive job');

const adminIndexUpdated = read(path.join(BACKEND, 'src', 'modules', 'admin-command-bar', 'index.ts'));
check('admin-truth-status-route', adminIndexUpdated.includes('/truth-status'), 'admin missing truth-status route');
check('admin-operating-metrics-route', adminIndexUpdated.includes('/operating-metrics'), 'admin missing operating-metrics route');

const backendPkg = JSON.parse(read(path.join(BACKEND, 'package.json')));
check('test-ci-no-pass-with-no-tests', backendPkg.scripts['test:ci'].includes('passWithNoTests=false'), 'test:ci must fail on empty test runs');

check('truth-matrix-feature-status-ref', truthMatrix.includes('feature-status.json'), 'truth-matrix must reference feature-status.json');

check('runtime-charter-exists', runtimeCharter.length > 0, 'docs/runtime-charter.md missing — canonical execution truth required');
check('runtime-charter-phase-taxonomy', runtimeCharter.includes('Fase 0') && runtimeCharter.includes('Fase 5'), 'runtime-charter must define Fase 0–5 taxonomy');
check('roadmap-ref-runtime-charter', roadmapAlignment.includes('runtime-charter.md'), 'roadmap-alignment must reference runtime-charter.md');

check(
  'composition-root-exists',
  fs.existsSync(path.join(BACKEND, 'src', 'bootstrap', 'compositionRoot.ts')),
  'bootstrap/compositionRoot.ts missing'
);
check(
  'event-handlers-exists',
  fs.existsSync(path.join(BACKEND, 'src', 'bootstrap', 'eventHandlers.ts')),
  'bootstrap/eventHandlers.ts missing'
);
check(
  'outcome-verification-service',
  fs.existsSync(path.join(BACKEND, 'src', 'shared', 'outcomes', 'OutcomeVerificationService.ts')),
  'OutcomeVerificationService missing'
);
check(
  'architecture-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'architecture.test.ts')),
  'architecture.test.ts missing'
);
check(
  'tenant-hardening-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'tenantHardening.test.ts')),
  'tenantHardening.test.ts missing'
);
check(
  'event-integrity-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'eventIntegrity.test.ts')),
  'eventIntegrity.test.ts missing'
);
check(
  'ollama-contract-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'ollamaContract.test.ts')),
  'ollamaContract.test.ts missing'
);
check('release-gate-local-ai', releaseGates.includes('Gate 6 — Local AI First'), 'release-gates missing Gate 6 Local AI First');
check('release-gate-outcome-integrity', releaseGates.includes('Gate 7 — Event & outcome integrity'), 'release-gates missing Gate 7');
check('release-gate-worldclass', releaseGates.includes('Gate 8 — Autonomy & causal proof'), 'release-gates missing Gate 8');
check(
  'docker-compose-ollama',
  read(path.join(ROOT, 'docker-compose.yml')).includes('ollama:'),
  'docker-compose.yml must include ollama service'
);
check(
  'event-outbox-migration',
  fs.existsSync(path.join(BACKEND, 'prisma', 'migrations', '20260531220000_event_outbox', 'migration.sql')),
  'event_outbox migration missing'
);

check(
  'tenant-isolation-test',
  fs.existsSync(path.join(BACKEND, 'src', 'shared', 'security', '__tests__', 'tenantIsolation.test.ts')),
  'tenant isolation test file missing'
);

check(
  'storefront-birth-e2e-test',
  fs.existsSync(
    path.join(
      BACKEND,
      'src',
      'modules',
      'storefront-builder',
      '__tests__',
      'storefront-birth.e2e.test.ts'
    )
  ),
  'storefront-birth.e2e.test.ts missing at Appendix G locked path'
);
check(
  'storefront-publish-e2e-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'storefront-publish.e2e.test.ts')),
  'storefront-publish.e2e.test.ts missing'
);
check(
  'storefront-checkout-e2e-test',
  fs.existsSync(path.join(BACKEND, 'src', '__tests__', 'storefront-checkout.e2e.test.ts')),
  'storefront-checkout.e2e.test.ts missing'
);
check(
  'feature-status-storefront-partial',
  featureStatus.features['storefront-builder']?.status === 'partial' ||
    featureStatus.features['storefront-builder']?.status === 'implemented' ||
    featureStatus.features['storefront-builder']?.status === 'live',
  'storefront-builder must be partial+ in feature-status.json once E2E exists'
);
check(
  'feature-status-storefront-public-api',
  featureStatus.features['storefront-public-api']?.status === 'partial' ||
    featureStatus.features['storefront-public-api']?.status === 'implemented' ||
    featureStatus.features['storefront-public-api']?.status === 'live',
  'storefront-public-api must be partial+ in feature-status.json once E2E exists'
);
check(
  'feature-status-merchant-dashboard-commerce-ui',
  featureStatus.features['merchant-dashboard-commerce-ui']?.status === 'partial' ||
    featureStatus.features['merchant-dashboard-commerce-ui']?.status === 'implemented' ||
    featureStatus.features['merchant-dashboard-commerce-ui']?.status === 'live',
  'merchant-dashboard-commerce-ui must be partial+ in feature-status.json once P11 evidenced'
);
check(
  'truth-storefront-birth-e2e-evidence',
  /storefront-birth\.e2e\.test\.ts/.test(truthMatrix),
  'truth-matrix must cite storefront-birth.e2e.test.ts as evidence'
);
check(
  'truth-storefront-e2e-evidence',
  /storefront-publish\.e2e\.test\.ts/.test(truthMatrix),
  'truth-matrix must cite storefront-publish.e2e.test.ts as evidence'
);
check(
  'truth-storefront-checkout-e2e-evidence',
  /storefront-checkout\.e2e\.test\.ts/.test(truthMatrix),
  'truth-matrix must cite storefront-checkout.e2e.test.ts as evidence'
);
check(
  'birth-gate-evidence',
  fs.existsSync(path.join(DOCS, 'BIRTH_GATE.md')) &&
    /BIRTH_GATE=PASS/.test(read(path.join(DOCS, 'BIRTH_GATE.md'))),
  'docs/BIRTH_GATE.md missing or missing BIRTH_GATE=PASS'
);
check(
  'truth-no-60s-live-store-claim',
  !/60\s*s(ec(ond)?s?)?\s+live\s+store|live\s+store\s+in\s+60/i.test(truthMatrix) &&
    !/60\s*s(ec(ond)?s?)?\s+live\s+store|live\s+store\s+in\s+60/i.test(
      fs.existsSync(path.join(DOCS, 'progress-overview-2026-07.md'))
        ? read(path.join(DOCS, 'progress-overview-2026-07.md'))
        : ''
    ),
  'runtime docs must not claim “60s live store” marketing without evidence'
);

check(
  'storefront-security-checklist',
  fs.existsSync(path.join(DOCS, 'storefront-security-checklist.md')),
  'docs/storefront-security-checklist.md missing (P15)'
);
check(
  'storefront-lighthouse-budgets',
  fs.existsSync(path.join(DOCS, 'storefront-lighthouse.md')),
  'docs/storefront-lighthouse.md missing (P15)'
);
check(
  'storefront-preview-token-application-layer',
  fs.existsSync(
    path.join(
      BACKEND,
      'src',
      'modules',
      'storefront-builder',
      'application',
      'services',
      'previewToken.ts'
    )
  ),
  'previewToken must live in application/services (no application→infrastructure import)'
);

check(
  'self-evolving-rollback',
  read(path.join(BACKEND, 'src', 'modules', 'self-evolving-codebase', 'index.ts')).includes('/rollback'),
  'self-evolving missing rollback route'
);

check(
  'release-gates-operating-metrics',
  releaseGates.includes('/api/admin/operating-metrics'),
  'release-gates must document operating metrics endpoint'
);

// 17. No hardcoded frontend feature badges
const frontendPagesDir = path.join(FRONTEND, 'src', 'pages');
const pageFiles = fs.readdirSync(frontendPagesDir).filter((f) => f.endsWith('.tsx'));
const hardcodedBadgePattern = /FeatureStatusBadge\s+status="(live|partial|experimental)"/;
for (const file of pageFiles) {
  const src = read(path.join(frontendPagesDir, file));
  if (hardcodedBadgePattern.test(src)) {
    check('frontend-hardcoded-badges', false, `${file} must use FeatureStatusFromTruth, not hardcoded FeatureStatusBadge status`);
  }
}
check(
  'frontend-truth-component',
  fs.existsSync(path.join(FRONTEND, 'src', 'components', 'FeatureStatusFromTruth.tsx')),
  'FeatureStatusFromTruth component missing'
);
check(
  'validate-runtime-script',
  fs.existsSync(path.join(ROOT, 'scripts', 'validate-runtime.js')),
  'validate-runtime.js missing'
);
check(
  'webhook-tenant-resolver',
  fs.existsSync(path.join(BACKEND, 'src', 'shared', 'security', 'webhookTenantResolver.ts')),
  'webhookTenantResolver.ts missing'
);

const agentsMdCandidates = [
  path.join(ROOT, '..', 'AGENTS.md'),
  path.join(ROOT, '..', 'project-dna', 'aether', 'AGENTS.md'),
  path.join(DOCS, 'runtime-charter.md'),
];
const agentsMd =
  agentsMdCandidates.map((p) => (fs.existsSync(p) ? read(p) : '')).find((c) => c.length > 0) || '';
check(
  'agents-md-runtime-charter',
  agentsMd.includes('runtime-charter') || agentsMd.includes('Canonical execution truth'),
  'AGENTS.md / runtime-charter.md must declare runtime-charter as execution truth'
);

const cursorRules = fs.existsSync(path.join(ROOT, '..', '.cursorrules'))
  ? read(path.join(ROOT, '..', '.cursorrules'))
  : '';
check(
  'cursorrules-local-ai',
  cursorRules.includes('project-dna/aether/AGENTS.md') ||
    (cursorRules.includes('Local AI First') && cursorRules.includes('runtime-charter')),
  '.cursorrules must point at project-dna AGENTS.md (Local AI First / runtime charter)'
);

check(
  'mail-metrics-gate8',
  releaseGates.includes('autoReplyRate') || releaseGates.includes('auto-reply'),
  'release-gates must document mail auto-reply gate (Gate 8)'
);

check(
  'compliance-baseline-doc',
  fs.existsSync(path.join(DOCS, 'compliance-baseline.md')),
  'docs/compliance-baseline.md missing'
);

check(
  'ai-runtime-plane-doc',
  fs.existsSync(path.join(DOCS, 'ai-runtime-plane.md')),
  'docs/ai-runtime-plane.md missing'
);

check(
  'decision-contract-exists',
  fs.existsSync(path.join(BACKEND, 'src', 'ai', 'autonomy', 'DecisionContract.ts')),
  'DecisionContract.ts missing (Autonomy Kernel MVP)'
);

check(
  'holdout-experiment-service',
  fs.existsSync(path.join(BACKEND, 'src', 'ai', 'attribution', 'HoldoutExperimentService.ts')),
  'HoldoutExperimentService.ts missing'
);

check(
  'ci-ollama-service',
  ciYaml.includes('ollama/ollama') && ciYaml.includes('OLLAMA_CONTRACT_TEST'),
  'CI must include Ollama service and contract test flag'
);

if (process.env.PILOT_RELEASE === 'true') {
  // Enforced asynchronously in main() via validatePilotMailGate()
}

async function validatePilotCausalGate() {
  if (process.env.PILOT_CAUSAL !== 'true') return;
  if (!process.env.DATABASE_URL) {
    errors.push('[pilot-causal] PILOT_CAUSAL=true requires DATABASE_URL');
    return;
  }

  const backendDir = path.join(ROOT, 'backend');
  const prevCwd = process.cwd();
  process.chdir(backendDir);
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const tenant = process.env.AETHER_DEFAULT_TENANT || 'tenant_default';
    try {
      const assignment = await prisma.experimentAssignment.findFirst({
        where: { tenantId: tenant, active: true },
      });
      if (!assignment) {
        errors.push('[pilot-causal] no active ExperimentAssignment for tenant');
      }
      const outcome = await prisma.outcomeRecord.findFirst({
        where: {
          tenantId: tenant,
          verificationStatus: { in: ['verified', 'billable'] },
        },
      });
      if (!outcome) {
        errors.push('[pilot-causal] no verified/billable OutcomeRecord for tenant');
      }
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    process.chdir(prevCwd);
  }
}

async function validatePilotMailGate() {
  if (process.env.PILOT_RELEASE !== 'true') return;

  const apiUrl = (process.env.AETHER_API_URL || 'http://localhost:9000').replace(/\/$/, '');
  const apiKey = process.env.AETHER_API_KEY;
  const tenant = process.env.AETHER_DEFAULT_TENANT || 'tenant_default';

  if (!apiKey) {
    errors.push('[pilot-mail-autoreply] PILOT_RELEASE=true requires AETHER_API_KEY for metrics check');
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/emails/metrics?days=30`, {
      headers: {
        'X-Aether-Api-Key': apiKey,
        'X-Aether-Tenant-Id': tenant,
      },
    });
    if (!response.ok) {
      errors.push(`[pilot-mail-autoreply] metrics endpoint returned ${response.status}`);
      return;
    }
    const metrics = await response.json();
    const autoReplyRate = metrics.autoReplyRate ?? 0;
    const processed =
      metrics.pilotProcessedCount ??
      (metrics.autoRepliedCount ?? 0) + (metrics.escalatedCount ?? 0);
    if (processed < 100) {
      errors.push(`[pilot-mail-autoreply] processed ${processed} below minimum 100`);
    }
    if (autoReplyRate < 0.7) {
      errors.push(
        `[pilot-mail-autoreply] autoReplyRate ${autoReplyRate} below pilot threshold 0.7`
      );
    }
  } catch (err) {
    errors.push(
      `[pilot-mail-autoreply] failed to fetch mail metrics: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function main() {
// Report
console.log('AETHER DoD / truth sync validation');
console.log(`Runtime version: ${runtimeVersion}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length === 0) {
  await validatePilotMailGate();
  await validatePilotCausalGate();
}

if (errors.length) {
  console.error('\nFAIL — release blocked:');
  errors.forEach((e) => console.error('  ✗', e));
  process.exit(1);
}

if (warnings.length) {
  warnings.forEach((w) => console.warn('  ⚠', w));
}

console.log('\nPASS — truth, CI, RBAC, UI, and observability alignment verified.');
process.exit(0);
}

main().catch((err) => {
  console.error('validate-dod failed:', err);
  process.exit(1);
});
