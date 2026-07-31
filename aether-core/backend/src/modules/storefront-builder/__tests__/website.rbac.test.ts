import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { requireOperator, requireViewer } from '../../../shared/security/rbac';

const API_DIR = path.resolve(__dirname, '../api');

const WEBSITE_ROUTE_MODULES = [
  'websiteRouter.ts',
  'websiteProjectsRoutes.ts',
  'websiteRevisionsRoutes.ts',
  'websitePagesRoutes.ts',
  'websiteBuildsPreviewRoutes.ts',
] as const;

function readWebsiteRouteSources(): string {
  return WEBSITE_ROUTE_MODULES.map((file) =>
    fs.readFileSync(path.join(API_DIR, file), 'utf8')
  ).join('\n');
}

describe('Website admin RBAC', () => {
  it('requireOperator rejects viewer; requireViewer allows viewer', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    requireOperator(
      { userRole: 'viewer' } as express.Request,
      { status, json } as unknown as express.Response,
      next
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Requires operator role' });
    expect(next).not.toHaveBeenCalled();

    status.mockClear();
    json.mockClear();
    next.mockClear();

    requireViewer(
      { userRole: 'viewer' } as express.Request,
      { status, json } as unknown as express.Response,
      next
    );
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it('website route modules mutations use requireOperator; GETs use requireViewer', () => {
    const source = readWebsiteRouteSources();

    const mutationSnippets = [
      "router.post(\n  '/projects',\n  requireOperator",
      "router.post(\n  '/projects/:projectId/revisions',\n  requireOperator",
      "router.put(\n  '/projects/:projectId/deploy-target',\n  requireOperator",
      "router.post(\n  '/revisions/:revisionId/build',\n  requireOperator",
      "router.post(\n  '/revisions/:revisionId/publish',\n  requireOperator",
      "router.patch(\n  '/pages/:pageId/copy',\n  requireOperator",
    ];
    for (const snippet of mutationSnippets) {
      expect(source).toContain(snippet);
    }

    expect(source).toContain("router.get('/projects', requireViewer");
    expect(source).toContain("router.get('/projects/:projectId', requireViewer");
  });

  it('website route modules must not use WebsiteController or import prisma client', () => {
    for (const file of WEBSITE_ROUTE_MODULES) {
      const source = fs.readFileSync(path.join(API_DIR, file), 'utf8');
      expect(source).not.toContain('WebsiteController');
      expect(source).not.toMatch(/shared\/prisma\/client/);
    }
  });

  it('every mutation verb is gated by requireOperator; every GET by requireViewer', () => {
    const source = readWebsiteRouteSources();

    const mutationRe =
      /router\.(post|put|patch|delete)\(\s*(?:'[^']+'|"[^"]+"|`[^`]+`|\n\s*'[^']+'),?\s*\n?\s*(\w+)/g;
    const getRe =
      /router\.get\(\s*(?:'[^']+'|"[^"]+"|`[^`]+`|\n\s*'[^']+'),?\s*\n?\s*(\w+)/g;

    const mutationGuards: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = mutationRe.exec(source)) !== null) {
      mutationGuards.push(m[2]);
    }
    expect(mutationGuards.length).toBeGreaterThanOrEqual(5);
    for (const guard of mutationGuards) {
      expect(guard).toBe('requireOperator');
    }

    const getGuards: string[] = [];
    while ((m = getRe.exec(source)) !== null) {
      getGuards.push(m[1]);
    }
    expect(getGuards.length).toBeGreaterThanOrEqual(5);
    for (const guard of getGuards) {
      expect(guard).toBe('requireViewer');
    }
  });
});
