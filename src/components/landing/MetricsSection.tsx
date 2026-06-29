import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingDown, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
      color: '#10B981',
    },
    {
      icon: Package,
      value: 30,
      suffix: '%',
      labelKey: 'metrics.stockOut',
      descKey: 'metrics.stockOutDesc',
      color: '#2563EB',
    },
    {
      icon: TrendingUp,
      value: 18,
      suffix: '%',
      labelKey: 'metrics.revenue',
      descKey: 'metrics.revenueDesc',
      color: '#10B981',
    },
    {
      icon: DollarSign,
      value: convertCurrency(2.5),
      prefix: currencySymbol,
      suffix: 'M+',
      labelKey: 'metrics.annualSavings',
      descKey: 'metrics.annualSavingsDesc',
      decimals: 1,
      color: '#F97316',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">{t('metrics.title')}</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
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
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="bg-white border border-[#E2E8F0] rounded-lg text-center p-4 sm:p-8">
                {/* Icon — flat container */}
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-[#F3F4F6] mb-4 sm:mb-6">
                  <metric.icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: metric.color }} />
                </div>

                {/* Value */}
                <div className="text-3xl sm:text-5xl font-bold text-[#0F172A] mb-2">
                  <AnimatedCounter
                    value={metric.value}
                    prefix={metric.prefix || ''}
                    suffix={metric.suffix}
                    decimals={metric.decimals || 0}
                  />
                </div>

                <h3 className="text-sm sm:text-lg font-semibold text-[#0F172A] mb-1">{t(metric.labelKey)}</h3>
                <p className="text-xs sm:text-sm text-[#64748B]">{t(metric.descKey)}</p>

                {/* Dot indicator */}
                <div className="mx-auto mt-3 w-1 h-1 rounded-full" style={{ background: metric.color }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
