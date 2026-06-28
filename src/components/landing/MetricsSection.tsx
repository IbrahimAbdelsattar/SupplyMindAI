import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingDown, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DURATIONS } from '@/lib/animations';

export const MetricsSection = () => {
  const { currencySymbol, convertCurrency } = useCurrency();
  const { t } = useTranslation('landing');

  const metrics = [
    {
      icon: TrendingDown,
      value: 25,
      suffix: '%',
      labelKey: 'metrics.inventoryCost',
      descKey: 'metrics.inventoryCostDesc',
      color: 'success',
    },
    {
      icon: Package,
      value: 30,
      suffix: '%',
      labelKey: 'metrics.stockOut',
      descKey: 'metrics.stockOutDesc',
      color: 'primary',
    },
    {
      icon: TrendingUp,
      value: 18,
      suffix: '%',
      labelKey: 'metrics.revenue',
      descKey: 'metrics.revenueDesc',
      color: 'accent',
    },
    {
      icon: DollarSign,
      value: convertCurrency(2.5),
      prefix: currencySymbol,
      suffix: 'M+',
      labelKey: 'metrics.annualSavings',
      descKey: 'metrics.annualSavingsDesc',
      decimals: 1,
      color: 'warning',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-card/50 border-y border-border relative overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-secondary/[0.02] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">{t('metrics.title')}</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('metrics.description')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.labelKey}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * DURATIONS.stagger * 2, ease: [0.23, 1, 0.32, 1] }}
              className="relative group"
            >
              <motion.div
                className="relative text-center p-4 sm:p-8"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Icon with 3D rotation on hover */}
                <motion.div
                  className={cn(
                    'inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl mb-4 sm:mb-6',
                    metric.color === 'success' && 'bg-success/10',
                    metric.color === 'primary' && 'bg-primary/10',
                    metric.color === 'accent' && 'bg-accent/10',
                    metric.color === 'warning' && 'bg-warning/10',
                  )}
                  whileHover={{
                    rotateY: 180,
                    scale: 1.1,
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <metric.icon className={cn(
                    'w-6 h-6 sm:w-8 sm:h-8',
                    metric.color === 'success' && 'text-success',
                    metric.color === 'primary' && 'text-primary',
                    metric.color === 'accent' && 'text-accent',
                    metric.color === 'warning' && 'text-warning',
                  )} />
                </motion.div>

                {/* Value with stagger */}
                <motion.div
                  className="text-3xl sm:text-5xl font-bold mb-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * DURATIONS.stagger * 2 + 0.2 }}
                >
                  <AnimatedCounter
                    value={metric.value}
                    prefix={metric.prefix || ''}
                    suffix={metric.suffix}
                    decimals={metric.decimals || 0}
                  />
                </motion.div>

                <h3 className="text-sm sm:text-lg font-semibold mb-1">{t(metric.labelKey)}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t(metric.descKey)}</p>

                {/* Subtle glow line under metric */}
                <div className={cn(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full transition-all duration-500 group-hover:w-16',
                  metric.color === 'success' && 'bg-success/40',
                  metric.color === 'primary' && 'bg-primary/40',
                  metric.color === 'accent' && 'bg-accent/40',
                  metric.color === 'warning' && 'bg-warning/40',
                )} />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
