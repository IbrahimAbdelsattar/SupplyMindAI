import { motion } from 'framer-motion';
import { ShoppingCart, Globe, Factory, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative border border-border rounded-2xl p-5 sm:p-8 bg-card hover:border-primary/30 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <useCase.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-2">{t(useCase.titleKey)}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{t(useCase.descKey)}</p>
                      <div className="flex flex-wrap gap-2">
                        {tagList.map((feature) => (
                          <span
                            key={feature}
                            className="px-2.5 py-1 text-xs sm:text-sm rounded-full bg-secondary text-secondary-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
