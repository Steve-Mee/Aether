import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/Button';
import { env } from '@/lib/config';
import { t } from '@/lib/i18n';
import { reportError } from '@/lib/observability/errorReporter';
import { logger } from '@/lib/observability/logger';

interface Props {
  children: ReactNode;
  /** Optional label for telemetry / logging. */
  name?: string;
  /** Called when user chooses to navigate home (route-level boundaries). */
  onGoHome?: () => void;
  /** Fired after a render error is caught (e.g. show critical dialog). */
  onCaught?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * App-wide React error boundary — catches render errors in child trees.
 * Pair with AsyncBoundary for async/load failures (not render throws).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const context = {
      boundary: this.props.name ?? 'app',
      componentStack: info.componentStack,
    };
    logger.error('boundary.caught', context, error);
    reportError(error, context);
    this.props.onCaught?.(error);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      const devDetail =
        env.isDev && this.state.error.message ? this.state.error.message : undefined;

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4">
            <ErrorState
              message={devDetail ?? t('error.boundary.message')}
              title={t('error.boundary.title')}
              onRetry={this.handleReset}
            />
            <div className="flex justify-center gap-2 flex-wrap">
              {this.props.onGoHome && (
                <Button variant="outline" size="sm" onClick={this.props.onGoHome}>
                  {t('error.boundary.goHome')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={this.handleReload}>
                {t('error.boundary.reload')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
