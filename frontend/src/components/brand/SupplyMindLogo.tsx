import React from 'react';
import { cn } from '@/lib/utils';

interface SupplyMindLogoProps {
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

/**
 * SupplyMind AI — Supply Chain Logo
 *
 * Stylized hexagonal logo with blue and green gradients and an upward-pointing arrow.
 * "From Chaos to Clarity in Supply Chain Management"
 */
export const SupplyMindLogo: React.FC<SupplyMindLogoProps> = ({
  className,
  iconOnly = false,
  iconClassName,
  textClassName,
}) => {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Adaptive Logo Image */}
      <img
        src="/supplymind-logo.jpg"
        alt="SupplyMind AI Logo"
        className={cn(
          'w-8 h-8 flex-shrink-0 object-contain transition-all duration-300',
          // Light mode: multiply makes the white background completely transparent
          'mix-blend-multiply',
          // Dark mode: invert & hue-rotate preserves colors but turns white to black,
          // then screen makes the black background completely transparent!
          'dark:invert dark:hue-rotate-180 dark:mix-blend-screen dark:brightness-125 dark:contrast-125',
          iconClassName
        )}
      />

      {/* Wordmark — hidden when iconOnly */}
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
