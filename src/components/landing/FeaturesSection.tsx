import { motion } from 'framer-motion';
import { Database, Brain, Settings2, LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const steps = [
  {
    icon: Database,
    titleKey: 'features.dataCollection',
    descKey: 'features.dataCollectionDesc',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
    shadowClass: 'hover:shadow-primary/15',
    glowColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    icon: Brain,
    titleKey: 'features.aiForecasting',
    descKey: 'features.aiForecastingDesc',
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10 border-accent/20',
    shadowClass: 'hover:shadow-accent/15',
    glowColor: 'rgba(6, 182, 212, 0.35)',
  },
  {
    icon: Settings2,
    titleKey: 'features.optimizationEngine',
    descKey: 'features.optimizationEngineDesc',
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
    shadowClass: 'hover:shadow-success/15',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    icon: LineChart,
    titleKey: 'features.businessDecisions',
    descKey: 'features.businessDecisionsDesc',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
    shadowClass: 'hover:shadow-warning/15',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export const FeaturesSection = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-background">
      {/* Soft overlay gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_65%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 sm:mb-24"
        >
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
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
              className="relative group cursor-pointer"
            >
              {/* Connector Line - futuristic dot design */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-14 left-full w-full h-[1px] bg-gradient-to-r from-border/80 via-primary/20 to-transparent z-0 pointer-events-none rtl:right-full rtl:left-auto rtl:bg-gradient-to-l" />
              )}
              
              <div 
                className={`relative bg-card/40 border border-border/60 backdrop-blur-md rounded-2xl p-6 sm:p-7 hover:border-primary/50 transition-all duration-350 hover:-translate-y-2 shadow-lg ${step.shadowClass} sweep-glow`}
                style={{
                  boxShadow: `0 0 0 rgba(0,0,0,0)`,
                }}
              >
                {/* Step Number */}
                <div 
                  className="absolute -top-3.5 -left-3.5 rtl:left-auto rtl:-right-3.5 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold shadow-md shadow-primary/20 tracking-wide"
                >
                  {index + 1}
                </div>
                
                {/* Icon Container with radial background glow */}
                <div 
                  className={`w-14 h-14 rounded-xl ${step.bgClass} border flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-300`}
                >
                  <step.icon className={`w-7 h-7 ${step.colorClass} drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]`} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-foreground tracking-wide">{t(step.titleKey)}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
