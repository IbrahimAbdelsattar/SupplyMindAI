import React from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, BarChart3, ShoppingCart, Building2, Activity, Loader2 } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { UseMutationResult } from '@tanstack/react-query';

interface Props {
  generateMutation: UseMutationResult<{ status: string; message: string; reports: unknown[] }, Error, void>;
  generateTypeMutation: UseMutationResult<{ status: string; message: string; report: unknown }, Error, string>;
}

const REPORT_TYPES = [
  { key: 'inventory_summary', label: 'Inventory Summary', desc: 'Current stock levels, coverage days, reorder recommendations', icon: BarChart3 },
  { key: 'sales_performance', label: 'Sales Performance', desc: 'Revenue, units sold, daily demand trends by product', icon: Activity },
  { key: 'abc_analysis', label: 'ABC Classification', desc: 'Products classified by revenue into A, B, C tiers', icon: Building2 },
  { key: 'purchase_analysis', label: 'Purchase Analysis', desc: 'Purchase volumes, spend, supplier breakdown', icon: ShoppingCart },
  { key: 'operations_overview', label: 'Operations Overview', desc: 'Consolidated KPIs across inventory, sales, procurement', icon: FileText },
];

export function ReportGenerator({ generateMutation, generateTypeMutation }: Props) {
  return (
    <section aria-label="Generate reports">
      <SectionHeader
        title="Generate Reports"
        subtitle="Create fresh reports from live data"
        icon={<FileText className="w-4 h-4" />}
        action={
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Generate all reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? 'Generating...' : 'Generate All'}
          </button>
        }
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isGenerating = generateTypeMutation.isPending && generateTypeMutation.variables === rt.key;
            return (
              <div
                key={rt.key}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{rt.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{rt.desc}</p>
                <button
                  onClick={() => generateTypeMutation.mutate(rt.key)}
                  disabled={generateTypeMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  aria-label={`Generate ${rt.label}`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            );
          })}
        </div>
        {generateMutation.isSuccess && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium"
            role="status"
          >
            All reports generated successfully. Refreshing list...
          </motion.p>
        )}
        {generateTypeMutation.isSuccess && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium"
            role="status"
          >
            Report generated successfully.
          </motion.p>
        )}
        {(generateMutation.isError || generateTypeMutation.isError) && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium"
            role="alert"
          >
            Failed to generate report. Please try again.
          </motion.p>
        )}
      </div>
    </section>
  );
}
