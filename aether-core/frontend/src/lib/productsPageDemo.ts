import type { ProductRowDemo } from '@/lib/data/types';
export type { ProductRowDemo } from '@/lib/data/types';

export function getProductsDemoItems(): ProductRowDemo[] {
  return [
    { id: 'prd_demo_1', name: 'Linen Overshirt', price: 89.0, stock: 42, status: 'active' },
    { id: 'prd_demo_2', name: 'Merino Crew Neck', price: 64.5, stock: 18, status: 'active' },
    { id: 'prd_demo_3', name: 'Selvedge Denim', price: 129.0, stock: 7, status: 'active' },
    { id: 'prd_demo_4', name: 'Wool Blazer', price: 249.0, stock: 3, status: 'low_stock' },
    { id: 'prd_demo_5', name: 'Archive Tee', price: 29.0, stock: 0, status: 'draft' },
    { id: 'prd_demo_6', name: 'Cashmere Scarf', price: 95.0, stock: 24, status: 'active' },
  ];
}
