import { useState, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Database, Brain, Settings2, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SPRING_NORMAL, DURATIONS } from '@/lib/animations';

const steps = [
  {
    icon: Database,
    titleKey: 'features.dataCollection',
    descKey: 'features.dataCollectionDesc',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
    glowColor: 'rgba(37, 99, 235, 0.15)',
  },
  {
    icon: Brain,
    titleKey: 'features.aiForecasting',
    descKey: 'features.aiForecastingDesc',
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: Settings2,
    titleKey: 'features.optimizationEngine',
    descKey: 'features.optimizationEngineDesc',
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary/10 border-secondary/20',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: LineChart,
    titleKey: 'features.businessDecisions',
    descKey: 'features.businessDecisionsDesc',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
    glowColor: 'rgba(245, 158, 11, 0.15)',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: DURATIONS.stagger * 1.5, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  },
};

export const FeaturesSection = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-16 sm:mb-24"
        >
          <h2 className="text-h1 mb-4 text-foreground">
            {t('features.title')}
          </h2>
          <p className="text-body sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.description')}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.titleKey}
              variants={itemVariants}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-14 left-full w-full h-[1px] bg-border z-0 pointer-events-none rtl:right-full rtl:left-auto" />
              )}
              
              <FeatureCard step={step} index={index} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/** Individual feature card with 3D tilt on hover */
function FeatureCard({ step, index }: { step: typeof steps[number]; index: number }) {
  const { t } = useTranslation('landing');
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setTiltStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ transform: 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)' });
  }, []);

  return (
    <div
      className="relative bg-card border border-border rounded-2xl p-6 sm:p-7 transition-[border-color] duration-200 hover:border-primary/50 cursor-default"
      style={{
        ...tiltStyle,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.2s ease-out',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none"
        style={{
          background: `radial-gradient(300px circle at 50% 50%, ${step.glowColor}, transparent 70%)`,
        }}
      />

      {/* Step Number */}
      <div className="absolute -top-3.5 -left-3.5 rtl:left-auto rtl:-right-3.5 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold tracking-wide" style={{ transform: 'translateZ(10px)' }}>
        {index + 1}
      </div>
      
      {/* Icon Container with 3D lift */}
      <motion.div
        className={`w-14 h-14 rounded-xl ${step.bgClass} border flex items-center justify-center mb-5`}
        style={{ transform: 'translateZ(20px)' }}
        whileHover={{ rotateY: 15, rotateX: -10, scale: 1.1 }}
        transition={SPRING_NORMAL}
      >
        <step.icon className={`w-7 h-7 ${step.colorClass}`} />
      </motion.div>
      
      <h3 className="text-xl font-bold mb-3 text-foreground tracking-wide">{t(step.titleKey)}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
    </div>
  );
}
