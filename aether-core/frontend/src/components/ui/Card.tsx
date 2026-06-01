import { type ReactNode } from 'react';
import React from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
