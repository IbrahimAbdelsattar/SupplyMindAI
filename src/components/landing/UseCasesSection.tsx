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
    <section className="py-16 sm:py-24 bg-[#F3F4F6]">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] mb-4">{t('useCases.title')}</h2>
          <p className="text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto">
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
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
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

/** Individual use case card — flat */
function UseCaseCard({ useCase, tagList }: { useCase: typeof useCases[number]; tagList: string[] }) {
  const { t } = useTranslation('landing');

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
          <useCase.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#2563EB]" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-semibold text-[#0F172A] mb-2">{t(useCase.titleKey)}</h3>
          <p className="text-sm sm:text-base text-[#64748B] mb-3 sm:mb-4">{t(useCase.descKey)}</p>
          <div className="flex flex-wrap gap-2">
            {tagList.map((feature) => (
              <span
                key={feature}
                className="px-2.5 py-1 text-xs sm:text-sm border border-[#E2E8F0] text-[#64748B] rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
