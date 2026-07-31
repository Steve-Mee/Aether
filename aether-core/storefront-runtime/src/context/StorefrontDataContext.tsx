'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StorefrontProduct } from '../sdk/storefrontClient';

export interface StorefrontData {
  tenantSlug: string;
  products: StorefrontProduct[];
  previewToken?: string;
}

const StorefrontDataContext = createContext<StorefrontData>({
  tenantSlug: '',
  products: [],
});

export function StorefrontDataProvider({
  value,
  children,
}: {
  value: StorefrontData;
  children: ReactNode;
}) {
  return (
    <StorefrontDataContext.Provider value={value}>
      {children}
    </StorefrontDataContext.Provider>
  );
}

export function useStorefrontData(): StorefrontData {
  return useContext(StorefrontDataContext);
}
