/**
 * Enhanced animation utilities and reusable animated components
 * Following Emil Design Engineering principles
 */

import { motion } from 'framer-motion';
import * as React from 'react';

// ── Easing Curves ──────────────────────────────────────────────
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// ── Framer Motion Spring Configs ────────────────────────────────
export const SPRING_SUBTLE = { type: 'spring' as const, duration: 0.5, bounce: 0.15 };
export const SPRING_NORMAL = { type: 'spring' as const, duration: 0.5, bounce: 0.2 };
export const SPRING_LIVELY = { type: 'spring' as const, duration: 0.6, bounce: 0.3 };
export const SPRING_PHYSICS = { type: 'spring' as const, mass: 1, stiffness: 100, damping: 10 };

// ── Duration Budgets (Emil's guidelines) ────────────────────────
export const DURATIONS = {
  buttonPress: 0.12,
  tooltip: 0.15,
  dropdown: 0.18,
  modal: 0.3,
  pageEnter: 0.4,
  stagger: 0.06,
} as const;

// ── Stagger Helpers ─────────────────────────────────────────────
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: DURATIONS.stagger,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
};

// ── Viewport Animation Presets ──────────────────────────────────
export const viewportFadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
};

export const viewportFadeScale = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
};

// ── 3D Transform Helpers ────────────────────────────────────────
export const PRESERVE_3D: React.CSSProperties = {
  transformStyle: 'preserve-3d',
  perspective: 1000,
};

export function calculateTilt(
  e: React.MouseEvent<HTMLDivElement>,
  strength = 10
): string {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -strength;
  const rotateY = ((x - centerX) / centerX) * strength;
  return `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
}

export const TILT_RESET = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';

// ── Magnetic Hover ──────────────────────────────────────────────
export function calculateMagnetic(
  e: React.MouseEvent<HTMLDivElement>,
  strength = 0.3
): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  return { x: x * strength, y: y * strength };
}

// ── Clip-Path Reveal ────────────────────────────────────────────
export const CLIP_HIDDEN_BOTTOM = 'inset(0 0 100% 0)';
export const CLIP_VISIBLE = 'inset(0 0 0% 0)';

// ═══════════════════════════════════════════════════════════════
//  REUSABLE ANIMATED COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface AnimatedIconProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverRotate?: number;
  tapScale?: number;
  springConfig?: typeof SPRING_SUBTLE;
  glowColor?: string;
  glowOnHover?: boolean;
  bounce?: boolean;
  asChild?: boolean;
}

/** AnimatedIcon - Make any icon alive with scale, rotate, and glow */
export const AnimatedIcon = React.forwardRef<HTMLDivElement, AnimatedIconProps>(
  ({ 
    children, 
    className = '', 
    hoverScale = 1.15, 
    hoverRotate = 8,
    tapScale = 0.92,
    springConfig = SPRING_SUBTLE,
    glowOnHover = false,
    asChild = false,
  }, ref) => {
    const IconWrapper = ({ children }: { children: React.ReactNode }) => (
      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={className}
        whileHover={{ 
          scale: hoverScale, 
          rotate: hoverRotate,
        }}
        whileTap={{ scale: tapScale }}
        transition={springConfig}
      >
        {children}
      </motion.div>
    );

    return asChild ? <IconWrapper>{children}</IconWrapper> : (
      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={`inline-flex items-center justify-center ${className}`}
        whileHover={{ 
          scale: hoverScale, 
          rotate: hoverRotate,
        }}
        whileTap={{ scale: tapScale }}
        transition={springConfig}
        style={{ transformOrigin: 'center' }}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedIcon.displayName = 'AnimatedIcon';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
  index?: number;
  tilt?: boolean;
  glowColor?: string;
  showGlowOnHover?: boolean;
  showBorderOnHover?: boolean;
  borderColor?: string;
  as?: 'div' | 'article' | 'section';
  onClick?: () => void;
}

/** AnimatedCard - 3D-tilt card with hover lift, glow, and entrance */
export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    children, 
    className = '', 
    hoverScale = 1.02,
    hoverY = -4,
    index = 0,
    tilt = false,
    showGlowOnHover = false,
    glowColor = '#2563EB',
    showBorderOnHover = false,
    borderColor = '#2563EB',
    as: Tag = 'div',
    onClick,
  }, ref) => {
    const [hovered, setHovered] = React.useState(false);
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ 
          duration: 0.55, 
          delay: index * 0.08, 
          ease: [0.23, 1, 0.32, 1] 
        }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={onClick}
        className={`relative cursor-default ${className}`}
        style={{ transformStyle: tilt ? 'preserve-3d' : 'flat' }}
      >
        <motion.div
          animate={hovered 
            ? { scale: hoverScale, y: hoverY } 
            : { scale: 1, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </motion.div>
    );
  }
);
AnimatedCard.displayName = 'AnimatedCard';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

/** StaggerContainer - Parent wrapper for staggered children animations */
export const StaggerContainer = ({ 
  children, 
  className = '',
  delay = 0,
  staggerDelay = 0.08,
}: StaggerContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** StaggerItem - Child of StaggerContainer for individual item animations */
export const StaggerItem = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string 
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** PulseRing - Animated ring/pulse effect around an element */
export const PulseRing = ({ 
  children, 
  className = '',
  color = 'bg-primary',
  size = 'full',
}: { 
  children: React.ReactNode; 
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <motion.div
        className={`absolute rounded-full ${color} opacity-20`}
        style={{ inset: size === 'full'憎' : size === 'lg' ? '-8px' : size === 'md' ? '-6px' : '-4px' }
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {children}
    </div>
  );
};

/** FloatingAnimation - Gentle float animation for elements */
export const FloatingAnimation = ({ 
  children, 
  className = '',
  yOffset = -6,
  duration = 3,
}: { 
  children: React.ReactNode; 
  className?: string;
  yOffset?: number;
  duration?: number;
}) => {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, yOffset, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

/** GlowOnHover - Add glow effect on hover to any element */
export const GlowOnHover = ({ 
  children, 
  className = '',
  glowColor = 'rgba(37, 99, 235, 0.3)',
  glowSize = 20,
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
  glowSize?: number;
}) => {
  return (
    <motion.div
      class={`relative ${className}`}
      whileHover={{ 
        boxShadow: `0 0 ${glowSize}px ${glowColor}`,
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
