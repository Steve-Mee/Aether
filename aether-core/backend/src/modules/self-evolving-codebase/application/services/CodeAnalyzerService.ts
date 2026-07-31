import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface CodeProposal {
  id: string;
  module: string;
  type: string;
  description: string;
  confidence: number;
  estimatedImpact?: string;
  rollbackPlan?: string;
  source: 'fixture' | 'static-analysis';
  staticChecks?: { lint: boolean | null; typecheck: boolean; security: boolean | null };
}

/**
 * Experimental self-evolving analyzer.
 * Does not invent performance claims. Static checks report honest results
 * (lint/security are null until real scanners are wired).
 */
export class CodeAnalyzerService {
  async scanModules(): Promise<string[]> {
    const modulesDir = path.resolve(process.cwd(), 'src/modules');
    if (!fs.existsSync(modulesDir)) return [];
    return fs.readdirSync(modulesDir).filter((d) => fs.statSync(path.join(modulesDir, d)).isDirectory());
  }

  async runStaticChecks(): Promise<{ lint: boolean | null; typecheck: boolean; security: boolean | null }> {
    let typecheck = true;
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() });
    } catch {
      typecheck = false;
    }
    // lint/security scanners are not wired — do not claim pass
    return { lint: null, typecheck, security: null };
  }

  async analyzeModule(moduleName: string): Promise<CodeProposal[]> {
    const checks = await this.runStaticChecks();
    // No heuristic proposal fabrication — return empty unless a real analyzer is enabled
    if (process.env.SELF_EVOLVING_FIXTURE_PROPOSALS !== 'true') {
      return [];
    }
    if (moduleName !== 'aether-mail') {
      return [];
    }
    return [
      {
        id: 'mail-001',
        module: moduleName,
        type: 'PERFORMANCE',
        description:
          'Fixture proposal only: consider webhook-based email intake instead of polling (not measured)',
        confidence: 0,
        estimatedImpact: 'unmeasured',
        rollbackPlan: 'N/A — fixture; do not apply in production',
        source: 'fixture',
        staticChecks: checks,
      },
    ];
  }

  async runSandboxValidation(proposalId: string): Promise<{ passed: boolean; proposalId: string; mode: string }> {
    if (process.env.SELF_EVOLVING_SANDBOX_ENABLED !== 'true') {
      const checks = await this.runStaticChecks();
      const passed = checks.typecheck === true;
      return { passed, proposalId, mode: 'static-typecheck-only' };
    }

    try {
      execSync(
        'docker run --rm -v "${PWD}:/app" -w /app node:20-alpine sh -c "npm run lint"',
        { stdio: 'pipe', cwd: process.cwd(), timeout: 120000, shell: '/bin/sh' }
      );
      return { passed: true, proposalId, mode: 'docker-sandbox' };
    } catch {
      return { passed: false, proposalId, mode: 'docker-sandbox' };
    }
  }
}
