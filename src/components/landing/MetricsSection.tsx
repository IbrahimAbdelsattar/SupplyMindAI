import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingDown, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const MetricsSection = () => {
  const { currencySymbol, convertCurrency } = useCurrency();
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const metrics = [
    { icon: TrendingDown, value: 25,                    suffix: '%',  labelKey: 'metrics.inventoryCost', descKey: 'metrics.inventoryCostDesc', color: '#10B981' },
    { icon: Package,      value: 30,                    suffix: '%',  labelKey: 'metrics.stockOut',      descKey: 'metrics.stockOutDesc',      color: '#2563EB' },
    { icon: TrendingUp,   value: 18,                    suffix: '%',  labelKey: 'metrics.revenue',       descKey: 'metrics.revenueDesc',       color: '#6366f1' },
    { icon: DollarSign,   value: convertCurrency(2.5),  suffix: 'M+', labelKey: 'metrics.annualSavings', descKey: 'metrics.annualSavingsDesc', color: '#F97316', prefix: currencySymbol, decimals: 1 },
  ];

  return (
    <section className="py-16 sm:py-28 relative overflow-hidden" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-0 w-96 h-96 rounded-full blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />
        <div className="absolute right-1/4 bottom-0 w-64 h-64 rounded-full blur-[60px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />
      </div>

      <div ref={ref} className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="text-center mb-12 sm:mb-20"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase text-primary mb-5 neu-card"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Proven Results
          </motion.div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{t('metrics.title')}</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{t('metrics.description')}</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.labelKey}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.55, delay: index * 0.09, ease: EASE_OUT }}
              whileHover={{ scale: 1.04, y: -4, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
              whileTap={{ scale: 0.97 }}
              className="relative group cursor-default"
            >
              <div
                className="h-full p-5 sm:p-8 rounded-3xl text-center relative overflow-hidden transition-all duration-300"
                style={{
                  background: 'var(--neu-bg, #dde1e7)',
                  boxShadow: '8px 8px 18px rgba(163,177,198,0.55), -8px -8px 18px rgba(255,255,255,0.85)',
                }}
              >
                {/* Corner glow - appears on hover */}
                <div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: metric.color }}
                />

                {/* Icon */}
                <motion.div
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl mb-5 sm:mb-6 neu-basin"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <motion.div
                    whileHover={{ rotate: -5, scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <metric.icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: metric.color }} />
                  </motion.div>
                </motion.div>

                {/* Animated number */}
                <div className="text-3xl sm:text-5xl font-extrabold mb-2 tracking-tight" style={{ color: metric.color }}>
                  {isInView && (
                    <AnimatedCounter
                      value={metric.value}
                      prefix={metric.prefix || ''}
                      suffix={metric.suffix}
                      decimals={metric.decimals || 0}
                      duration={1.8}
                    />
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">{t(metric.labelKey)}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{t(metric.descKey)}</p>

                {/* Animated bottom bar */}
                <motion.div
                  className="absolute bottom-0 left-1/4 right-1/4 h-1 rounded-t-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: metric.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
