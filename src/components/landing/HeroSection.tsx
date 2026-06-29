import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';

const heroChartData = Array.from({ length: 50 }, (_, i) => ({
  value: 30 + Math.sin(i / 5) * 20 + Math.random() * 10 + i * 0.5,
}));

export const HeroSection = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border mb-8 neu-card"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">{t('hero.badge')}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6"
          >
            <span className="block text-foreground">{t('hero.headline1')}</span>
            <span className="block text-primary">{t('hero.headline2')}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 px-2"
          >
            {t('hero.subheadline')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/dashboard" className="neu-glow inline-flex items-center gap-2 px-8 py-3.5 text-white text-lg font-semibold transition-colors">
              {t('hero.ctaPrimary')}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/dashboard" className="neu-btn inline-flex items-center gap-2 px-8 py-3.5 text-lg font-semibold transition-colors">
              <Play className="h-5 w-5" />
              {t('hero.ctaSecondary')}
            </Link>
          </motion.div>

          {/* Hero Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
            className="mx-auto max-w-4xl"
          >
            <div className="neu-card p-4 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="w-3 h-3 rounded-full bg-warning" />
                  <span className="w-3 h-3 rounded-full bg-success" />
                </div>
                <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{t('hero.chartLabel')}</span>
              </div>
              <div className="h-44 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroChartData}>
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fill="url(#heroGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};