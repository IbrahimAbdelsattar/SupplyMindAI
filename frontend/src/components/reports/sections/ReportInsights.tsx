import React from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { Recommendation } from '../data/types';

interface Props {
  recommendations: Recommendation[];
}

export function ReportInsights({ recommendations }: Props) {
  const topInsights = recommendations.slice(0, 5);

  const getInsightIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'high':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Lightbulb className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const getInsightColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-500/5';
      case 'high':
        return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5';
      default:
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/5';
    }
  };

  return (
    <section aria-label="Report insights">
      <SectionHeader
        title="Key Insights"
        subtitle="AI-powered recommendations"
        icon={<Sparkles className="w-4 h-4" />}
        badge={
          topInsights.length > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {topInsights.length} new
            </span>
          ) : undefined
        }
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5">
        {topInsights.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No insights available yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topInsights.map((rec, idx) => (
              <div
                key={rec.product_id || idx}
                className={`rounded-xl border border-slate-100 dark:border-slate-800 border-l-4 p-3 ${getInsightColor(rec.riskLevel)}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    {getInsightIcon(rec.riskLevel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {rec.product_name || rec.product_id || 'Product'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {rec.reason || `Risk level: ${rec.riskLevel}. Suggested action: adjust order quantity.`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {rec.costSavings > 0 && (
                        <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                          Save ${rec.costSavings.toLocaleString()}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        rec.riskLevel === 'critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                          : rec.riskLevel === 'high'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {rec.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
