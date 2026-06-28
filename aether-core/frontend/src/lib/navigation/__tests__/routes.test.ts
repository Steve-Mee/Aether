import { describe, expect, it } from 'vitest';
import {
  appRoutes,
  COMMAND_CENTER_PATH,
  getRenderableRoutes,
  getRedirectRoutes,
  getRoutesByLayout,
  isCommandCenterHome,
  minimalNavItems,
  normalizePathname,
  resolveModule,
} from '../routes';
import { lazyPageMap } from '../appRoutes';

describe('navigation routes', () => {
  it('redirects legacy home paths to command center', () => {
    expect(normalizePathname('/')).toBe(COMMAND_CENTER_PATH);
    expect(normalizePathname('/home')).toBe(COMMAND_CENTER_PATH);
    const redirects = getRedirectRoutes();
    expect(redirects.find((r) => r.path === '/')?.redirectTo).toBe(COMMAND_CENTER_PATH);
    expect(redirects.find((r) => r.path === '/home')?.redirectTo).toBe(COMMAND_CENTER_PATH);
  });

  it('redirects activity aliases to timeline', () => {
    expect(redirectsFor('/activity')).toBe('/timeline');
    expect(redirectsFor('/history')).toBe('/timeline');
  });

  it('every renderable route has a lazy page', () => {
    for (const route of getRenderableRoutes()) {
      expect(lazyPageMap[route.path], `missing lazy for ${route.path}`).toBeDefined();
    }
  });

  it('minimalNavItems match inNav renderable routes', () => {
    const inNavPaths = appRoutes.filter((r) => r.inNav && !r.redirectTo).map((r) => r.path);
    expect(minimalNavItems.map((i) => i.to).sort()).toEqual(inNavPaths.sort());
  });

  it('includes suppliers in primary nav', () => {
    expect(minimalNavItems.some((i) => i.to === '/suppliers')).toBe(true);
  });

  it('includes agents hub in primary nav', () => {
    expect(minimalNavItems.some((i) => i.to === '/agents')).toBe(true);
    expect(lazyPageMap['/agents']).toBeDefined();
  });

  it('resolves command center module from aliases', () => {
    expect(resolveModule('/')).toBe('command-center');
    expect(resolveModule(COMMAND_CENTER_PATH)).toBe('command-center');
    expect(isCommandCenterHome('/')).toBe(true);
    expect(isCommandCenterHome(COMMAND_CENTER_PATH)).toBe(true);
  });

  it('groups routes by layout', () => {
    const overview = getRoutesByLayout('overview');
    expect(overview.some((r) => r.path === COMMAND_CENTER_PATH)).toBe(true);
    expect(overview.some((r) => r.path === '/approvals')).toBe(true);
    expect(getRoutesByLayout('deep').some((r) => r.path === '/suppliers')).toBe(true);
    expect(getRoutesByLayout('settings').some((r) => r.path === '/settings')).toBe(true);
  });
});

function redirectsFor(path: string): string | undefined {
  return appRoutes.find((r) => r.path === path)?.redirectTo;
}
