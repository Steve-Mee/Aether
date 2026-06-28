import * as fs from 'fs';
import * as path from 'path';

describe('Architecture boundary tests', () => {
  const MODULES_ROOT = path.resolve(__dirname, '../modules');
  const BOOTSTRAP_ROOT = path.resolve(__dirname, '../bootstrap');

  /** Read-side overview/notification services pending repository extraction. */
  const APPLICATION_PRISMA_ALLOWLIST = new Set([
    'admin-command-bar/application/services/ActivityFeedService.ts',
    'admin-command-bar/application/services/AgentRosterService.ts',
    'admin-command-bar/application/services/HandoffOverviewService.ts',
    'admin-command-bar/application/services/jobs/NotificationBackfillJob.ts',
    'admin-command-bar/application/services/jobs/NotificationDigestJob.ts',
    'admin-command-bar/application/services/jobs/OverviewDigestJob.ts',
    'admin-command-bar/application/services/jobs/OverviewFeedBackfillJob.ts',
    'admin-command-bar/application/services/NotificationInboxService.ts',
    'admin-command-bar/application/services/NotificationReadStateService.ts',
    'admin-command-bar/application/services/notifications/NotificationGrouper.ts',
    'admin-command-bar/application/services/notifications/NotificationRepository.ts',
    'admin-command-bar/application/services/notifications/NotificationWriter.ts',
    'admin-command-bar/application/services/OverviewFeedService.ts',
    'admin-command-bar/application/services/OverviewFeedWriter.ts',
    'admin-command-bar/application/services/OverviewNotificationDispatcher.ts',
    'admin-command-bar/application/services/SuggestionService.ts',
    'admin-command-bar/application/services/UiAdoptionMetricsService.ts',
    'admin-command-bar/application/use-cases/ExecuteNaturalLanguageCommandUseCase.ts',
    'admin-command-bar/application/use-cases/UndoCommandUseCase.ts',
    'bilateral-exchange/application/BilateralExchangeService.ts',
    'bilateral-exchange/application/BilateralExportBuilder.ts',
    'merchant-auth/application/LoginUseCase.ts',
  ]);

  const CONTROLLER_PRISMA_ALLOWLIST = new Set([
    'admin-command-bar/api/controllers/AdminController.ts',
  ]);

  const CROSS_MODULE_INFRA_ALLOWLIST = new Set([
    'admin-command-bar/application/services/OverviewNotificationDispatcher.ts',
  ]);

  function relModulePath(file: string): string {
    return path.relative(MODULES_ROOT, file).replace(/\\/g, '/');
  }

  function listTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...listTsFiles(full));
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) results.push(full);
    }
    return results;
  }

  it('application layer must not import infrastructure from other modules', () => {
    const violations: string[] = [];
    const applicationFiles = listTsFiles(MODULES_ROOT).filter((f) =>
      f.includes(`${path.sep}application${path.sep}`)
    );
    for (const file of applicationFiles) {
      const rel = relModulePath(file);
      if (CROSS_MODULE_INFRA_ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (/from ['"]\.\.\/\.\.\/\.\.\/[^'"]+\/infrastructure\//.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('api controllers must not import prisma client directly', () => {
    const violations: string[] = [];
    const controllerFiles = listTsFiles(MODULES_ROOT).filter((f) =>
      f.includes(`${path.sep}api${path.sep}controllers${path.sep}`)
    );
    for (const file of controllerFiles) {
      const rel = relModulePath(file);
      if (CONTROLLER_PRISMA_ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (/from ['"].*shared\/prisma\/client['"]/.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('application layer must not import same-module infrastructure', () => {
    const violations: string[] = [];
    const applicationFiles = listTsFiles(MODULES_ROOT).filter((f) =>
      f.includes(`${path.sep}application${path.sep}`)
    );
    for (const file of applicationFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/from ['"]\.\.\/\.\.\/infrastructure\//.test(content)) {
        violations.push(path.relative(MODULES_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('composition root exists and wires bootstrap', () => {
    const rootPath = path.join(BOOTSTRAP_ROOT, 'compositionRoot.ts');
    expect(fs.existsSync(rootPath)).toBe(true);
    const content = fs.readFileSync(rootPath, 'utf8');
    expect(content).toContain('bootstrapApplication');
    expect(content).toContain('adminData');
  });

  it('no tenant_default in infrastructure persistence', () => {
    const persistenceFiles = listTsFiles(MODULES_ROOT).filter((f) =>
      f.includes(`${path.sep}infrastructure${path.sep}persistence${path.sep}`)
    );
    const violations: string[] = [];
    for (const file of persistenceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/tenant_default/.test(content)) {
        violations.push(path.relative(MODULES_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('application layer must not import prisma client directly', () => {
    const violations: string[] = [];
    const applicationFiles = listTsFiles(MODULES_ROOT).filter((f) =>
      f.includes(`${path.sep}application${path.sep}`)
    );
    for (const file of applicationFiles) {
      const rel = relModulePath(file);
      if (APPLICATION_PRISMA_ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (/from ['"].*shared\/prisma\/client['"]/.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it('TaskExecutor must not import prisma client', () => {
    const taskExecutorPath = path.resolve(__dirname, '../ai/orchestrator/TaskExecutor.ts');
    const content = fs.readFileSync(taskExecutorPath, 'utf8');
    expect(content).not.toMatch(/shared\/prisma\/client/);
    expect(content).toContain('getCompositionRoot');
  });

  it('MonitorSupplierUseCase must not be constructed outside composition root', () => {
    const violations: string[] = [];
    const srcRoot = path.resolve(__dirname, '..');
    function scan(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '__tests__'].includes(entry.name)) continue;
          scan(full);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          const rel = path.relative(srcRoot, full).replace(/\\/g, '/');
          if (rel === 'bootstrap/compositionRoot.ts') continue;
          if (rel.includes('ai/orchestrator/TaskExecutor.ts')) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (/new MonitorSupplierUseCase\s*\(/.test(content)) {
            violations.push(rel);
          }
        }
      }
    }
    scan(srcRoot);
    expect(violations).toEqual([]);
  });

  it('verifyOutcome is deprecated and has no external callers', () => {
    const outcomeEnginePath = path.resolve(__dirname, '../ai/attribution/OutcomeEngine.ts');
    const content = fs.readFileSync(outcomeEnginePath, 'utf8');
    expect(content).toMatch(/@deprecated/);

    const srcRoot = path.resolve(__dirname, '..');
    const violations: string[] = [];
    function scan(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          scan(full);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          if (full === outcomeEnginePath) continue;
          const fileContent = fs.readFileSync(full, 'utf8');
          if (/\bverifyOutcome\s*\(/.test(fileContent) && !fileContent.includes('verifyOutcomeWithEvidence')) {
            violations.push(path.relative(srcRoot, full));
          }
        }
      }
    }
    scan(srcRoot);
    expect(violations).toEqual([]);
  });
});
