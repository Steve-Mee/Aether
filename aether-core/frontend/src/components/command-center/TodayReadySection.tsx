import React from 'react';
import { SectionLabel } from './primitives';
import HighRiskApprovalsCard from '../insight-cards/HighRiskApprovalsCard';
import PricingOptimizationCard from '../insight-cards/PricingOptimizationCard';
import SupplierPriceDropCard from '../insight-cards/SupplierPriceDropCard';

export default function TodayReadySection() {
  return (
    <section className="space-y-5" aria-labelledby="today-ready-heading">
      <SectionLabel
        id="today-ready-heading"
        title="Vandaag voor je klaar"
        subtitle="Drie acties klaar — bevestig of laat AETHER uitvoeren."
      />

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <PricingOptimizationCard />
        <SupplierPriceDropCard />
        <HighRiskApprovalsCard />
      </div>
    </section>
  );
}
