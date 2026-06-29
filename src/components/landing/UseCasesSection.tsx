import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShoppingCart, Globe, Factory, Pill, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const useCases = [
  {
    icon: ShoppingCart, color: '#2563EB',
    titleKey: 'useCases.retail',       descKey: 'useCases.retailDesc',
    tagsKey:  'useCases.retailTags',   fallbackTags: ['Multi-store optimization', 'Seasonal forecasting', 'Promotion planning'],
  },
  {
    icon: Globe, color: '#10B981',
    titleKey: 'useCases.ecommerce',    descKey: 'useCases.ecommerceDesc',
    tagsKey:  'useCases.ecommerceTags', fallbackTags: ['Real-time demand tracking', 'Fulfillment optimization', 'Return prediction'],
  },
  {
    icon: Factory, color: '#6366f1',
    titleKey: 'useCases.manufacturing', descKey: 'useCases.manufacturingDesc',
    tagsKey: 'useCases.manufacturingTags', fallbackTags: ['Production planning', 'Raw material optimization', 'Supply chain sync'],
  },
  {
    icon: Pill, color: '#F97316',
    titleKey: 'useCases.pharmacies',   descKey: 'useCases.pharmaciesDesc',
    tagsKey:  'useCases.pharmaciesTags', fallbackTags: ['Expiry management', 'Compliance tracking', 'Emergency stock alerts'],
  },
];

function UseCaseCard({ useCase, tagList, isInView, delay }: {
  useCase: typeof useCases[number];
  tagList: string[];
  isInView: boolean;
  delay: number;
}) {
  const { t } = useTranslation('landing');
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay, ease: EASE_OUT }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative cursor-default"
    >
      <motion.div
        animate={hovered ? { scale: 1.02, y: -4 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="h-full p-5 sm:p-8 rounded-3xl relative overflow-hidden"
        style={{
          background: 'var(--neu-bg, #dde1e7)',
          boxShadow: hovered
            ? `10px 10px 24px rgba(163,177,198,0.6), -10px -10px 24px rgba(255,255,255,0.9), 0 0 0 2px ${useCase.color}25`
            : '7px 7px 16px rgba(163,177,198,0.5), -7px -7px 16px rgba(255,255,255,0.8)',
          transition: 'box-shadow 250ms ease-out',
        }}
      >
        {/* Background glow */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[40px] transition-opacity duration-400 pointer-events-none"
          style={{ background: useCase.color, opacity: hovered ? 0.12 : 0.05 }}
        />

        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
          {/* Icon */}
          <motion.div
            className="flex-shrink-0 w-[52px] h-[52px] sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center neu-basin"
            animate={hovered ? { rotate: 8, scale: 1.1 } : { rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          >
            <motion.div
              animate={hovered ? { rotate: -5, scale: 1.15 } : { rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <useCase.icon className="w-6 h-6" style={{ color: useCase.color }} />
            </motion.div>
          </motion.div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{t(useCase.titleKey)}</h3>
              <motion.div
                animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <ArrowRight className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: useCase.color }} />
              </motion.div>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed">{t(useCase.descKey)}</p>

            <div className="flex flex-wrap gap-2">
              {tagList.map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: delay + 0.1 + i * 0.05, ease: EASE_OUT, duration: 0.3 }}
                  className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full neu-btn"
                  style={{ color: useCase.color }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </div>
        </div>

          {/* Animated bottom border */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
          style={{ transformOrigin: 'left', background: `linear-gradient(to right, ${useCase.color}, transparent)` }}
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        />
      </motion.div>
    </motion.div>
  );
}

export const UseCasesSection = () => {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="py-16 sm:py-28 relative overflow-hidden" style={{ background: 'var(--neu-bg, #dde1e7)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/3 w-96 h-96 rounded-full blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)' }} />
        <div className="absolute left-0 bottom-1/4 w-72 h-72 rounded-full blur-[60px]" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />
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
            Industries we serve
          </motion.div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{t('useCases.title')}</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{t('useCases.description')}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
          {useCases.map((useCase, index) => {
            const tags = t(useCase.tagsKey, { returnObjects: true });
            const tagList = Array.isArray(tags) ? tags : useCase.fallbackTags;
            return (
              <UseCaseCard
                key={useCase.titleKey}
                useCase={useCase}
                tagList={tagList}
                isInView={isInView}
                delay={index * 0.1}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
