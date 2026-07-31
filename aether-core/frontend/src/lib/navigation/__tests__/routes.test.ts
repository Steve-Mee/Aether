import { describe, expect, it } from 'vitest';
import {
  appRoutes,
  COMMAND_CENTER_PATH,
  getRenderableRoutes,
  getRedirectRoutes,
  getRoutesByLayout,
  INTENT_ROUTES,
  isCommandCenterHome,
  minimalNavItems,
  normalizePathname,
  resolveModule,
  resolveSidecarBoostId,
  routeForIntent,
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

  it('maps STORE_* intents to website routes and boosts /website sidecar', () => {
    expect(INTENT_ROUTES.STORE_BUILD).toBe('/website');
    expect(INTENT_ROUTES.STORE_ITERATE).toBe('/website/preview');
    expect(INTENT_ROUTES.STORE_PUBLISH).toBe('/website/publish');
    expect(INTENT_ROUTES.STORE_STATUS).toBe('/website');
    expect(routeForIntent('STORE_PUBLISH')).toBe('/website/publish');
    expect(resolveSidecarBoostId('/website')).toBe('approvals');
    expect(resolveSidecarBoostId('/website/publish')).toBe('approvals');
  });

  it('registers website module routes with lazy pages and nav entry', () => {
    const websitePaths = [
      '/website',
      '/website/brief',
      '/website/preview',
      '/website/pages',
      '/website/publish',
      '/pages',
    ];
    for (const path of websitePaths) {
      expect(lazyPageMap[path], `missing lazy for ${path}`).toBeDefined();
      expect(appRoutes.some((r) => r.path === path && r.module === 'website')).toBe(true);
    }
    expect(resolveModule('/website')).toBe('website');
    expect(resolveModule('/website/preview')).toBe('website');
    expect(resolveModule('/pages')).toBe('website');
    expect(getRoutesByLayout('deep').some((r) => r.path === '/website')).toBe(true);
    expect(getRoutesByLayout('deep').some((r) => r.path === '/pages')).toBe(true);
    expect(
      minimalNavItems
        .filter((i) => i.navGroup === 'website')
        .map((i) => i.to)
        .sort(),
    ).toEqual(websitePaths.slice().sort());
    expect(minimalNavItems.some((i) => i.to === '/pages' && i.labelKey === 'nav.pages')).toBe(true);
  });

  it('registers commerce depth routes with nav group and sidecar boosts', () => {
    const commercePaths = [
      '/products',
      '/products/new',
      '/products/:id',
      '/orders',
      '/orders/:id',
      '/customers',
      '/customers/:id',
      '/inventory',
      '/promotions',
      '/payments',
    ];
    for (const path of commercePaths) {
      expect(lazyPageMap[path], `missing lazy for ${path}`).toBeDefined();
      expect(appRoutes.some((r) => r.path === path)).toBe(true);
    }
    expect(
      minimalNavItems
        .filter((i) => i.navGroup === 'commerce')
        .map((i) => i.to)
        .sort(),
    ).toEqual(
      ['/customers', '/inventory', '/orders', '/payments', '/products', '/promotions'].sort(),
    );
    expect(INTENT_ROUTES.INVENTORY_STATUS).toBe('/inventory');
    expect(INTENT_ROUTES.RESTOCK_SUGGEST).toBe('/inventory');
    expect(INTENT_ROUTES.PROMOTION_LIST).toBe('/promotions');
    expect(resolveSidecarBoostId('/products/prod_1')).toBe('margin');
    expect(resolveSidecarBoostId('/orders')).toBe('approvals');
    expect(resolveSidecarBoostId('/orders/ord_1')).toBe('approvals');
    expect(resolveSidecarBoostId('/customers')).toBe('proactive');
    expect(resolveSidecarBoostId('/inventory')).toBe('margin');
    expect(resolveSidecarBoostId('/promotions')).toBe('margin');
    expect(resolveSidecarBoostId('/payments')).toBe('uplift');
  });
});

function redirectsFor(path: string): string | undefined {
  return appRoutes.find((r) => r.path === path)?.redirectTo;
}
