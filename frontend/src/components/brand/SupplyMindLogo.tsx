import React from 'react';
import { cn } from '@/lib/utils';

interface SupplyMindLogoProps {
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

export const SupplyMindLogo: React.FC<SupplyMindLogoProps> = ({
  className,
  iconOnly = false,
  iconClassName,
  textClassName,
}) => {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src="/supplymind-logo.png"
        alt="SupplyMind AI Logo"
        className={cn(
          'w-8 h-8 flex-shrink-0 object-contain transition-all duration-300',
          iconClassName
        )}
      />

      {!iconOnly && (
        <span
          className={cn(
            'text-lg font-bold tracking-tight text-foreground',
            textClassName
          )}
        >
          SupplyMind
        </span>
      )}
    </span>
  );
};
