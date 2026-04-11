import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { TrendingDown, TrendingUp, DollarSign, Package } from 'lucide-react';

const metrics = [
  {
    icon: TrendingDown,
    value: 25,
    suffix: '%',
    label: 'Inventory Cost Reduction',
    description: 'Average reduction in holding costs',
    color: 'success',
  },
  {
    icon: Package,
    value: 30,
    suffix: '%',
    label: 'Stock-Out Reduction',
    description: 'Fewer missed sales opportunities',
    color: 'primary',
  },
  {
    icon: TrendingUp,
    value: 18,
    suffix: '%',
    label: 'Revenue Increase',
    description: 'Through optimized availability',
    color: 'accent',
  },
  {
    icon: DollarSign,
    value: 2.5,
    suffix: 'M+',
    label: 'Annual Savings',
    description: 'Average enterprise savings',
    decimals: 1,
    color: 'warning',
  },
];

export const MetricsSection = () => {
  return (
    <section className="py-16 sm:py-24 bg-card/50 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Business Impact</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Real results from companies using our AI-powered platform
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-center p-4 sm:p-8">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-${metric.color}/10 mb-4 sm:mb-6`}>
                  <metric.icon className={`w-6 h-6 sm:w-8 sm:h-8 text-${metric.color}`} />
                </div>
                <div className="text-3xl sm:text-5xl font-bold mb-2">
                  <AnimatedCounter
                    value={metric.value}
                    suffix={metric.suffix}
                    decimals={metric.decimals || 0}
                    className="gradient-text"
                  />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold mb-1">{metric.label}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{metric.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
