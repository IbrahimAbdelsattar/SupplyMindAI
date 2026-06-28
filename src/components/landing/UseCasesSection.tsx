import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Globe, Factory, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DURATIONS, SPRING_NORMAL } from '@/lib/animations';

const useCases = [
  {
    icon: ShoppingCart,
    titleKey: 'useCases.retail',
    descKey: 'useCases.retailDesc',
    tagsKey: 'useCases.retailTags',
    fallbackTags: ['Multi-store optimization', 'Seasonal forecasting', 'Promotion planning'],
  },
  {
    icon: Globe,
    titleKey: 'useCases.ecommerce',
    descKey: 'useCases.ecommerceDesc',
    tagsKey: 'useCases.ecommerceTags',
    fallbackTags: ['Real-time demand tracking', 'Fulfillment optimization', 'Return prediction'],
  },
  {
    icon: Factory,
    titleKey: 'useCases.manufacturing',
    descKey: 'useCases.manufacturingDesc',
    tagsKey: 'useCases.manufacturingTags',
    fallbackTags: ['Production planning', 'Raw material optimization', 'Supply chain sync'],
  },
  {
    icon: Pill,
    titleKey: 'useCases.pharmacies',
    descKey: 'useCases.pharmaciesDesc',
    tagsKey: 'useCases.pharmaciesTags',
    fallbackTags: ['Expiry management', 'Compliance tracking', 'Emergency stock alerts'],
  },
];

export const UseCasesSection = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">{t('useCases.title')}</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('useCases.description')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {useCases.map((useCase, index) => {
            const tags = t(useCase.tagsKey, { returnObjects: true });
            const tagList = Array.isArray(tags) ? tags : useCase.fallbackTags;

            return (
              <motion.div
                key={useCase.titleKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * DURATIONS.stagger * 2, ease: [0.23, 1, 0.32, 1] }}
                className="group relative"
              >
                <UseCaseCard useCase={useCase} tagList={tagList} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/** Individual use case card with magnetic hover and clip-path reveal */
function UseCaseCard({ useCase, tagList }: { useCase: typeof useCases[number]; tagList: string[] }) {
  const { t } = useTranslation('landing');
  const [magnetStyle, setMagnetStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMagnetStyle({
      transform: `translate(${x * 0.03}px, ${y * 0.03}px)`,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMagnetStyle({ transform: 'translate(0px, 0px)' });
    setIsHovered(false);
  }, []);

  return (
    <div
      className="relative border border-border rounded-2xl p-5 sm:p-8 bg-card hover:border-primary/30 transition-[border-color] duration-200 overflow-hidden cursor-default"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Clip-path reveal gradient on hover */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none"
        style={{
          clipPath: isHovered ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
          transition: 'clip-path 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      />

      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative">
        <motion.div
          className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center"
          style={magnetStyle}
          whileHover={{ rotateY: 15, scale: 1.1 }}
          transition={SPRING_NORMAL}
        >
          <useCase.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </motion.div>
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-semibold mb-2">{t(useCase.titleKey)}</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{t(useCase.descKey)}</p>
          <div className="flex flex-wrap gap-2">
            {tagList.map((feature, i) => (
              <motion.span
                key={feature}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ scale: 1.05, y: -1 }}
                className="px-2.5 py-1 text-xs sm:text-sm rounded-full bg-secondary text-secondary-foreground cursor-default"
              >
                {feature}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
