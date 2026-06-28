import React from 'react';
import { cn } from '@/lib/utils';

interface SupplyMindLogoProps {
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

/**
 * SupplyMind AI — Geometric "S" Network Logo
 *
 * A precise geometric "S" shape formed by interconnected network nodes.
 * The logo uses four key nodes (circles) with flowing cubic bezier paths
 * to create a minimal, flat SaaS brandmark.
 *
 * Anti-pattern guard: No gradients, no drop shadows, no 3D effects.
 * SVG uses vector-effect="non-scaling-stroke" for crisp rendering at any size.
 */
export const SupplyMindLogo: React.FC<SupplyMindLogoProps> = ({
  className,
  iconOnly = false,
  iconClassName,
  textClassName,
}) => {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Geometric "S" Network Icon */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('w-8 h-8 flex-shrink-0', iconClassName)}
        aria-label="SupplyMind AI"
        vectorEffect="non-scaling-stroke"
      >
        {/* Connecting paths — flowing cubic bezier curves */}
        <path
          d="M8 10 C8 6 12 4 16 6 C20 8 22 6 24 6"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 12 C24 16 20 18 16 16 C12 14 10 16 8 16"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M8 22 C8 26 12 28 16 26 C20 24 22 26 24 26"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />

        {/* Path connector lines — horizontal */}
        <line
          x1="8" y1="10" x2="8" y2="16"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="24" y1="12" x2="24" y2="26"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Network nodes — filled circles */}
        <circle cx="8" cy="10" r="2.5" fill="#2563EB" vectorEffect="non-scaling-stroke" />
        <circle cx="24" cy="6" r="2.5" fill="#2563EB" vectorEffect="non-scaling-stroke" />
        <circle cx="24" cy="12" r="2.5" fill="#2563EB" vectorEffect="non-scaling-stroke" />
        <circle cx="8" cy="16" r="2.5" fill="#10B981" vectorEffect="non-scaling-stroke" />
        <circle cx="24" cy="26" r="2.5" fill="#2563EB" vectorEffect="non-scaling-stroke" />

        {/* Inner connected node */}
        <circle cx="16" cy="16" r="2" fill="#2563EB" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Wordmark — hidden when iconOnly */}
      {!iconOnly && (
        <span
          className={cn(
            'text-lg font-bold tracking-tight text-foreground',
            textClassName
          )}
        >
          SupplyMind
          <span className="text-primary ml-0.5">AI</span>
        </span>
      )}
    </span>
  );
};
