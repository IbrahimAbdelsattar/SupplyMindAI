import { useState, useRef } from 'react';
import { motion, useSpring, useTransform, useMotionValue, useInView } from 'framer-motion';
import { Database, Brain, Settings2, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const steps = [
  { icon: Database,  titleKey: 'features.dataCollection',     descKey: 'features.dataCollectionDesc',     color: '#2563EB', accent: 'rgba(37,99,235,0.12)'   },
  { icon: Brain,     titleKey: 'features.aiForecasting',      descKey: 'features.aiForecastingDesc',      color: '#10B981', accent: 'rgba(16,185,129,0.12)'  },
  { icon: Settings2, titleKey: 'features.optimizationEngine', descKey: 'features.optimizationEngineDesc', color: '#6366f1', accent: 'rgba(99,102,241,0.12)'  },
  { icon: LineChart, titleKey: 'features.businessDecisions',  descKey: 'features.businessDecisionsDesc',  color: '#F97316', accent: 'rgba(249,115,22,0.12)'  },
];

// Interactive 3D card with spring mouse tracking
function FeatureCard3D({ step, index }: { step: typeof steps[number]; index: number }) {
  const { t } = useTranslation('landing');
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); setHovered(false); }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="relative cursor-default h-full touch-none"
    >
      <div
        className="h-full p-6 sm:p-8 rounded-3xl relative overflow-hidden transition-all duration-300"
        style={{
          background: 'var(--neu-bg, #dde1e7)',
          boxShadow: hovered
            ? `8px 8px 20px rgba(163,177,198,0.6), -8px -8px 20px rgba(255,255,255,0.9), 0 0 0 2px ${step.color}30`
            : '6px 6px 14px rgba(163,177,198,0.5), -6px -6px 14px rgba(255,255,255,0.8)',
        }}
      >
        {/* Glow blob in corner */}
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-[30px] transition-opacity duration-300 pointer-events-none"
          style={{ background: step.accent, opacity: hovered ? 1 : 0.5 }}
        />

        {/* Step badge */}
        <div
          className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shadow-md"
          style={{ background: step.color }}
        >
          {index + 1}
        </div>

        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative z-10 neu-basin"
          animate={hovered ? { scale: 1.12, rotate: 6 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.12, rotate: 6 }}
        >
          <motion.div
            animate={hovered ? { rotate: -6, scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <step.icon className="w-7 h-7" style={{ color: step.color }} />
          </motion.div>
        </motion.div>

        <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">{t(step.titleKey)}</h3>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed relative z-10">{t(step.descKey)}</p>

        {/* Animated bottom accent bar */}
        <motion.div
          className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full"
          style={{ transformOrigin: 'left', background: `linear-gradient(to right, ${step.color}, transparent)` }}
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        />
      </div>
    </motion.div>
  );
}

export const FeaturesSection = () => {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-20 sm:py-32 relative overflow-hidden" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      {/* Subtle section divider orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)' }} />

      <div ref={ref} className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="text-center mb-16 sm:mb-20"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase text-primary mb-5 neu-card"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            How it works
          </motion.div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{t('features.title')}</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{t('features.description')}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.titleKey}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.55, delay: index * 0.1, ease: EASE_OUT }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full z-0 pointer-events-none rtl:right-full rtl:left-auto" style={{ paddingLeft: 4, paddingRight: 4 }}>
                  <div className="h-px" style={{ background: `linear-gradient(to right, ${step.color}60, ${steps[index+1].color}60)` }} />
                </div>
              )}
              <FeatureCard3D step={step} index={index} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
