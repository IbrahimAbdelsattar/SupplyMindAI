import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionHeader } from '../shared/SectionHeader';
import { InsightCard } from '../shared/InsightCard';
import type { InsightItem, InsightCategory } from '../data/types';

interface InsightsFeedProps {
  insights: InsightItem[];
}

export function InsightsFeed({ insights }: InsightsFeedProps) {
  const { t } = useTranslation('commandCenter');
  const [activeCategory, setActiveCategory] = useState<InsightCategory | 'all'>('all');

  const categories: { key: InsightCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('insights.all') },
    { key: 'opportunity', label: t('insights.opportunity') },
    { key: 'risk', label: t('insights.risk') },
    { key: 'optimization', label: t('insights.optimization') },
    { key: 'trend', label: t('insights.trend') },
    { key: 'anomaly', label: t('insights.anomaly') },
  ];

  const filtered = activeCategory === 'all'
    ? insights
    : insights.filter((i) => i.category === activeCategory);

  return (
    <div className="neu-card p-5">
      <SectionHeader
        title="AI Insights"
        subtitle={`${insights.length} active insights`}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      />

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter insights by category">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            role="tab"
            aria-selected={activeCategory === cat.key}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
              ${activeCategory === cat.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filtered.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            >
              <InsightCard
                title={insight.title}
                body={insight.body}
                category={insight.category}
                confidence={insight.confidence}
                timestamp={insight.timestamp}
                source={insight.source}
                actionable={insight.actionable}
                actionLabel={insight.actionLabel}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
            No insights in this category
          </div>
        )}
      </div>
    </div>
  );
}
