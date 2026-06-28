import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

interface CriticalErrorDialogProps {
  open: boolean;
  onDismiss: () => void;
}

/**
 * Shown from app-root ErrorBoundary after a render crash — calm recovery options.
 */
export function CriticalErrorDialog({ open, onDismiss }: CriticalErrorDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('error.critical.title')}</DialogTitle>
          <DialogDescription>{t('error.boundary.message')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onDismiss();
              navigate('/command-center');
            }}
          >
            {t('error.boundary.goHome')}
          </Button>
          <Button onClick={() => window.location.reload()}>{t('error.boundary.reload')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CriticalErrorDialog;
