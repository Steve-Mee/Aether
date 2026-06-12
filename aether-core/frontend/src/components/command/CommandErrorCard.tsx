import React from 'react';
import { ErrorState } from '@/components/ui';

interface CommandErrorCardProps {
  message: string;
  onRetry?: () => void;
}

export default function CommandErrorCard({ message, onRetry }: CommandErrorCardProps) {
  return (
    <ErrorState
      message={message}
      onRetry={onRetry}
      className="mt-3"
      data-testid="command-error-card"
    />
  );
}
