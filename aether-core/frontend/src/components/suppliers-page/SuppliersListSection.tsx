import React from 'react';
import SupplierCard from './SupplierCard';
import type { SupplierListItem } from '@/types/supplier';

interface SuppliersListSectionProps {
  suppliers: SupplierListItem[];
  onOpen: (id: string) => void;
  highlightedSupplierId?: string | null;
}

export default function SuppliersListSection({
  suppliers,
  onOpen,
  highlightedSupplierId,
}: SuppliersListSectionProps) {
  return (
    <section data-testid="suppliers-list">
      <ul role="list" className="space-y-4">
        {suppliers.map((s) => (
          <li key={s.id}>
            <SupplierCard
              supplier={s}
              onOpen={onOpen}
              highlighted={highlightedSupplierId === s.id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
