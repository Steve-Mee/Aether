import React from 'react';
import CommandCenterHeroBar from './command-center/CommandCenterHeroBar';
import TodayReadySection from './command-center/TodayReadySection';

export default function CommandCenterShell() {
  return (
    <div className="w-full pt-1 sm:pt-2 animate-fade-in" data-testid="command-center-ready">
      <CommandCenterHeroBar />
      <TodayReadySection />
    </div>
  );
}
