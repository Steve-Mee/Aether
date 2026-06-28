import SyncIndicator from './SyncIndicator';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import UserMenu from './UserMenu';
import { merchantDisplayName } from '@/lib/merchantDisplay';
import AetherBrandMark from './AetherBrandMark';
import LiveStatusChip from './LiveStatusChip';
import ActivityPulse from './ActivityPulse';

export default function AppTopBar() {
  return (
    <header
      data-testid="app-top-bar"
      className={cn(
        'hidden lg:flex items-center justify-between gap-4 shrink-0',
        'px-5 py-3 border-b border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 z-30',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AetherBrandMark size="sm" />
        <div className="min-w-0">
          <div className="font-semibold text-sm tracking-tight text-foreground">AETHER</div>
          <div className="text-meta text-muted-foreground truncate">{merchantDisplayName()}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 min-w-0 motion-safe:transition-opacity motion-safe:duration-fast">
        <SyncIndicator />
        <LiveStatusChip />
        <ActivityPulse />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
