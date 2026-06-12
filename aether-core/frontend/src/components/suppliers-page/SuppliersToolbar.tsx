import React, { useMemo } from 'react';
import { SegmentedControl, SearchInput } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { SupplierStatusTab } from '@/types/supplier';

const TABS: SupplierStatusTab[] = ['all', 'active', 'inactive', 'recent'];

const tabKeys: Record<SupplierStatusTab, string> = {
  all: 'suppliers.tab.all',
  active: 'suppliers.tab.active',
  inactive: 'suppliers.tab.inactive',
  recent: 'suppliers.tab.recent',
};

interface SuppliersToolbarProps {
  activeTab: SupplierStatusTab;
  onTabChange: (tab: SupplierStatusTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function SuppliersToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: SuppliersToolbarProps) {
  const options = useMemo(() => TABS.map((tab) => ({ value: tab, label: t(tabKeys[tab]) })), []);

  return (
    <div className="mb-6 space-y-4" data-testid="suppliers-toolbar">
      <SegmentedControl
        options={options}
        value={activeTab}
        onChange={onTabChange}
        data-testid="suppliers-tab"
        aria-label={t('nav.suppliers')}
      />

      <SearchInput
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('suppliers.search.placeholder')}
        label={t('a11y.searchSuppliers')}
        data-testid="suppliers-search"
        wrapperClassName="max-w-md"
      />
    </div>
  );
}
