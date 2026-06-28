import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            'group toast !bg-card !border-border/40 !text-foreground !shadow-elevated !rounded-[var(--radius-xl)] !max-w-[min(24rem,calc(100vw-2rem))] motion-safe:animate-fade-in motion-safe:transition-transform motion-safe:duration-fast',
          title: '!text-body !font-medium',
          description: '!text-meta !text-muted-foreground',
          closeButton:
            '!bg-transparent !border-border/40 !text-muted-foreground hover:!text-foreground',
          success: '!border-success/30',
          warning: '!border-warning/30',
          error: '!border-danger/30',
        },
      }}
    />
  );
}
