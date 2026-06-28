import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LOGIN_PATH } from '@/lib/auth/adapters/stubAuthAdapter';
import { useAuth } from '@/lib/auth/AuthProvider';
import { can } from '@/lib/auth/permissions';
import { initialsFromDisplayName } from '@/lib/auth/userDisplay';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { t } from '@/lib/i18n';
import { cn, focusRing } from '@/lib/utils';

export default function UserMenu() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  const initials = initialsFromDisplayName(currentUser.name);
  const roleLabel = t(`userMenu.role.${currentUser.role}`);
  const showSettings = can(currentUser, 'settings.manage');

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate(LOGIN_PATH, { replace: true });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg',
            'text-sm text-muted-foreground hover:text-foreground',
            'hover:bg-surface-elevated/50 transition-colors duration-fast',
            focusRing(),
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={currentUser.name}
          data-testid="user-menu"
        >
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-foreground shrink-0"
            aria-hidden
          >
            {initials}
          </span>
          <span className="hidden xl:inline truncate max-w-[8rem]">{currentUser.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="min-w-[11rem] p-1"
        role="menu"
        aria-label={t('userMenu.label')}
      >
        <div className="px-3 py-2 border-b border-border/30">
          <div className="text-sm text-foreground truncate">{currentUser.name}</div>
          <div className="text-caption text-muted-foreground truncate">{roleLabel}</div>
        </div>
        <Link
          role="menuitem"
          to={moduleLinks.commandCenter}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/25 rounded-lg',
            focusRing(),
          )}
        >
          <User size={14} aria-hidden />
          {t('nav.commandCenter')}
        </Link>
        {showSettings && (
          <Link
            role="menuitem"
            to={moduleLinks.settings}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/25 rounded-lg',
              focusRing(),
            )}
          >
            <Settings size={14} aria-hidden />
            {t('nav.settings')}
          </Link>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={() => void handleSignOut()}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/25 rounded-lg',
            focusRing(),
          )}
        >
          <LogOut size={14} aria-hidden />
          {t('userMenu.signOut')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
