import { motion, type Variants } from 'framer-motion';
import { Database, Brain, Settings2, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const steps = [
  {
    icon: Database,
    titleKey: 'features.dataCollection',
    descKey: 'features.dataCollectionDesc',
    color: '#2563EB',
  },
  {
    icon: Brain,
    titleKey: 'features.aiForecasting',
    descKey: 'features.aiForecastingDesc',
    color: '#10B981',
  },
  {
    icon: Settings2,
    titleKey: 'features.optimizationEngine',
    descKey: 'features.optimizationEngineDesc',
    color: '#10B981',
  },
  {
    icon: LineChart,
    titleKey: 'features.businessDecisions',
    descKey: 'features.businessDecisionsDesc',
    color: '#F97316',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  },
};

export const FeaturesSection = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-16 sm:mb-24"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
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
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-14 left-full w-full h-px bg-border z-0 pointer-events-none rtl:right-full rtl:left-auto" />
              )}

              <FeatureCard step={step} index={index} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/** Individual flat feature card */
function FeatureCard({ step, index }: { step: typeof steps[number]; index: number }) {
  const { t } = useTranslation('landing');

  return (
    <div className="bg-card border border-border rounded-lg p-6 sm:p-7 relative">
      {/* Step Number — flat blue badge */}
      <div className="absolute -top-3.5 -left-3.5 rtl:left-auto rtl:-right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white">
        {index + 1}
      </div>

      {/* Icon Container — flat */}
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-5">
        <step.icon className="w-7 h-7" style={{ color: step.color }} />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-3">{t(step.titleKey)}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
    </div>
  );
}
