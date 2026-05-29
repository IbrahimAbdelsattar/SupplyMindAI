import { motion } from 'framer-motion';
import { Database, Brain, Settings2, LineChart } from 'lucide-react';

const steps = [
  {
    icon: Database,
    title: 'Data Collection',
    description: 'Real-time ingestion of sales, inventory, and market data from multiple sources.',
    color: 'primary',
  },
  {
    icon: Brain,
    title: 'AI Forecasting',
    description: 'Deep learning models analyze patterns and predict future demand with 95%+ accuracy.',
    color: 'accent',
  },
  {
    icon: Settings2,
    title: 'Optimization Engine',
    description: 'Mathematical optimization algorithms determine optimal inventory levels.',
    color: 'success',
  },
  {
    icon: LineChart,
    title: 'Business Decisions',
    description: 'Actionable insights and automated recommendations for smarter decisions.',
    color: 'warning',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const FeaturesSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_70%)]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">How It Works</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Our AI platform transforms raw data into actionable business intelligence in four seamless steps.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              variants={itemVariants}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-border to-transparent z-0" />
              )}
              
              <div className="relative bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${step.color}/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${step.color}`} />
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
