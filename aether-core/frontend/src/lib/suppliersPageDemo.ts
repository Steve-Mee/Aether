import type { SupplierDetail, SupplierListItem, SupplierOverviewStats } from '@/types/supplier';

const now = new Date();
const daysAgo = (d: number) => {
  const t = new Date(now);
  t.setDate(t.getDate() - d);
  return t.toISOString();
};

export const DEMO_SUPPLIER_IDS = {
  nordic: 'demo_sup_nordic',
  greenline: 'demo_sup_greenline',
  atlas: 'demo_sup_atlas',
  primetools: 'demo_sup_primetools',
  berg: 'demo_sup_berg',
  solarmax: 'demo_sup_solarmax',
  kitchenpro: 'demo_sup_kitchenpro',
  urban: 'demo_sup_urban',
} as const;

export function getSuppliersDemoSnapshot(): {
  stats: SupplierOverviewStats;
  suppliers: SupplierListItem[];
} {
  return {
    stats: {
      totalMonitored: 5,
      activeAutoSyncs: 4,
      syncsCompletedThisMonth: 18,
      priceDropsThisMonth: 3,
      autonomousPriceAdjustments: 2,
    },
    suppliers: [
      {
        id: DEMO_SUPPLIER_IDS.nordic,
        name: 'Nordic Supply Co.',
        website: 'https://nordic-supply.example',
        supplierType: 'wholesale',
        status: 'active',
        autoSyncEnabled: true,
        productCount: 48,
        lastSyncAt: daysAgo(0),
        lastAutoSyncAt: daysAgo(0),
        recentChangeCount: 4,
        hasRecentPriceDrop: true,
        hasRecentStockChange: false,
        hasRecentImportantChange: true,
        monitoringLabel: 'sync_on',
      },
      {
        id: DEMO_SUPPLIER_IDS.berg,
        name: 'Berg & Berg Textiles',
        website: 'https://berg-textiles.example',
        supplierType: 'manufacturer',
        status: 'active',
        autoSyncEnabled: true,
        productCount: 22,
        lastSyncAt: daysAgo(1),
        lastAutoSyncAt: daysAgo(1),
        recentChangeCount: 2,
        hasRecentPriceDrop: true,
        hasRecentStockChange: false,
        hasRecentImportantChange: true,
        monitoringLabel: 'sync_on',
      },
      {
        id: DEMO_SUPPLIER_IDS.atlas,
        name: 'Atlas Home BV',
        website: 'https://atlas-home.example',
        supplierType: 'manufacturer',
        status: 'active',
        autoSyncEnabled: false,
        productCount: 15,
        lastSyncAt: daysAgo(2),
        lastAutoSyncAt: daysAgo(2),
        recentChangeCount: 1,
        hasRecentPriceDrop: false,
        hasRecentStockChange: true,
        hasRecentImportantChange: true,
        monitoringLabel: 'active',
      },
      {
        id: DEMO_SUPPLIER_IDS.greenline,
        name: 'GreenLine Wholesale',
        website: 'https://greenline.example',
        supplierType: 'wholesale',
        status: 'active',
        autoSyncEnabled: true,
        productCount: 31,
        lastSyncAt: daysAgo(3),
        lastAutoSyncAt: daysAgo(3),
        recentChangeCount: 0,
        hasRecentPriceDrop: false,
        hasRecentStockChange: false,
        hasRecentImportantChange: false,
        monitoringLabel: 'sync_on',
      },
      {
        id: DEMO_SUPPLIER_IDS.kitchenpro,
        name: 'KitchenPro Direct',
        website: 'https://kitchenpro.example',
        supplierType: 'distributor',
        status: 'active',
        autoSyncEnabled: true,
        productCount: 64,
        lastSyncAt: daysAgo(1),
        lastAutoSyncAt: daysAgo(1),
        recentChangeCount: 0,
        hasRecentPriceDrop: false,
        hasRecentStockChange: false,
        hasRecentImportantChange: false,
        monitoringLabel: 'sync_on',
      },
      {
        id: DEMO_SUPPLIER_IDS.solarmax,
        name: 'SolarMax Components',
        website: 'https://solarmax.example',
        supplierType: 'wholesale',
        status: 'active',
        autoSyncEnabled: true,
        productCount: 12,
        lastSyncAt: daysAgo(5),
        lastAutoSyncAt: daysAgo(5),
        recentChangeCount: 0,
        hasRecentPriceDrop: false,
        hasRecentStockChange: false,
        hasRecentImportantChange: false,
        monitoringLabel: 'sync_on',
      },
      {
        id: DEMO_SUPPLIER_IDS.urban,
        name: 'Urban Goods BV',
        website: 'https://urban-goods.example',
        supplierType: 'wholesale',
        status: 'inactive',
        autoSyncEnabled: false,
        productCount: 8,
        lastSyncAt: daysAgo(14),
        lastAutoSyncAt: daysAgo(14),
        recentChangeCount: 0,
        hasRecentPriceDrop: false,
        hasRecentStockChange: false,
        hasRecentImportantChange: false,
        monitoringLabel: 'disabled',
      },
      {
        id: DEMO_SUPPLIER_IDS.primetools,
        name: 'PrimeTools Europe',
        website: 'https://primetools.example',
        supplierType: 'distributor',
        status: 'disabled',
        autoSyncEnabled: false,
        productCount: 0,
        lastSyncAt: null,
        lastAutoSyncAt: null,
        recentChangeCount: 0,
        hasRecentPriceDrop: false,
        hasRecentStockChange: false,
        hasRecentImportantChange: false,
        monitoringLabel: 'disabled',
      },
    ],
  };
}

export function getSupplierDemoDetail(supplierId: string): SupplierDetail | null {
  const base = getSuppliersDemoSnapshot().suppliers.find((s) => s.id === supplierId);
  if (!base) return null;

  const changes =
    supplierId === DEMO_SUPPLIER_IDS.nordic
      ? [
          {
            id: 'demo_ch_1',
            changeType: 'price_change',
            payload: {
              sku: 'NS-1001',
              name: 'Camping Kettle 1L',
              oldPrice: 26.2,
              newPrice: 24.5,
            },
            status: 'pending',
            createdAt: daysAgo(0),
          },
          {
            id: 'demo_ch_2',
            changeType: 'price_change',
            payload: {
              sku: 'NS-2040',
              name: 'Trek Pole Set',
              oldPrice: 52.0,
              newPrice: 49.0,
            },
            status: 'pending',
            createdAt: daysAgo(1),
          },
        ]
      : supplierId === DEMO_SUPPLIER_IDS.berg
        ? [
            {
              id: 'demo_ch_3',
              changeType: 'price_change',
              payload: { sku: 'BB-12', name: 'Merino Scarf', oldPrice: 31.5, newPrice: 28.0 },
              status: 'pending',
              createdAt: daysAgo(1),
            },
          ]
        : supplierId === DEMO_SUPPLIER_IDS.atlas
          ? [
              {
                id: 'demo_ch_4',
                changeType: 'stock_change',
                payload: { sku: 'AH-88', name: 'Linen Throw', oldStock: 42, newStock: 18 },
                status: 'pending',
                createdAt: daysAgo(2),
              },
            ]
          : [];

  const products =
    supplierId === DEMO_SUPPLIER_IDS.nordic
      ? [
          {
            id: 'demo_p1',
            sku: 'NS-1001',
            name: 'Camping Kettle 1L',
            currentPrice: 24.5,
            stock: 120,
            lastUpdated: daysAgo(0),
          },
          {
            id: 'demo_p2',
            sku: 'NS-2040',
            name: 'Trek Pole Set',
            currentPrice: 49.0,
            stock: 45,
            lastUpdated: daysAgo(1),
          },
        ]
      : supplierId === DEMO_SUPPLIER_IDS.kitchenpro
        ? [
            {
              id: 'demo_p3',
              sku: 'KP-A1',
              name: 'Chef Knife 20cm',
              currentPrice: 39.5,
              stock: 75,
              lastUpdated: daysAgo(1),
            },
          ]
        : [];

  const recentSyncs = [
    {
      id: 'demo_sync_1',
      at: base.lastAutoSyncAt ?? daysAgo(1),
      source: 'auto' as const,
      actor: 'scheduler',
      label: 'monitor',
      productsFound: base.productCount > 0 ? Math.min(base.productCount, 12) : 0,
      changeCount: base.recentChangeCount,
    },
    {
      id: 'demo_sync_2',
      at: daysAgo(3),
      source: 'monitor' as const,
      actor: 'merchant',
      label: 'monitor',
      productsFound: base.productCount,
      changeCount: 0,
    },
  ].filter((s) => s.at);

  return {
    ...base,
    recentChanges: changes,
    recentProducts: products,
    recentSyncs,
  };
}
