import React from 'react';
import { motion } from 'framer-motion';
import { Radio, CircleAlert, CircleCheck, Clock, Zap } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { TracingData, TracingAgent } from '../data/types';

interface LangSmithDashboardProps {
  tracing: TracingData | undefined;
  isLoading: boolean;
}

function StatusDot({ status }: { status: TracingAgent['status'] }) {
  const color =
    status === 'healthy'
      ? 'bg-emerald-500 shadow-emerald-500/50'
      : status === 'degraded'
        ? 'bg-amber-500 shadow-amber-500/50'
        : 'bg-slate-400 shadow-slate-400/50';
  return (
    <span
      className={`relative flex h-2.5 w-2.5 flex-shrink-0 ${status !== 'idle' ? 'shadow-sm' : ''}`}
      aria-label={`Status: ${status}`}
    >
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n < 1) return `${(n * 1000).toFixed(0)}ms`;
  return `${n.toFixed(1)}s`;
}

function AgentCard({ agent }: { agent: TracingAgent }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{agent.label || agent.name}</p>
            <StatusDot status={agent.status} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {agent.model}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-white dark:bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Calls</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {agent.calls_last_24h.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Errors</p>
          <p className={`text-sm font-bold mt-1 ${agent.errors_last_24h > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {agent.errors_last_24h}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Latency</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
            {fmt(agent.avg_latency_seconds)}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-800/50 p-2.5 text-center">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Error Rate</p>
          <p className={`text-sm font-bold mt-1 ${
            agent.calls_last_24h > 0 && agent.errors_last_24h / agent.calls_last_24h > 0.05
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {agent.calls_last_24h > 0
              ? `${((agent.errors_last_24h / agent.calls_last_24h) * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LangSmithDashboard({ tracing, isLoading }: LangSmithDashboardProps) {
  const project = tracing?.project ?? '—';
  const enabled = tracing?.enabled ?? false;
  const agents = tracing?.agents ?? [];
  const totalCalls = tracing?.total_calls ?? 0;
  const totalErrors = tracing?.errors_last_24h ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="LangSmith Agent Tracing"
        subtitle={project}
        icon={<Radio className="w-4 h-4" aria-hidden="true" />}
        badge={
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            enabled
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-blue-500/5 dark:bg-blue-500/10 p-3 text-center">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">Total Calls</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '—' : totalCalls.toLocaleString()}
          </p>
        </div>
        <div className={`rounded-xl p-3 text-center ${totalErrors > 0 ? 'bg-rose-500/5 dark:bg-rose-500/10' : 'bg-emerald-500/5 dark:bg-emerald-500/10'}`}>
          <p className={`text-[10px] uppercase tracking-wide font-medium ${totalErrors > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Errors (24h)
          </p>
          <p className={`text-lg font-bold mt-1 ${totalErrors > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isLoading ? '—' : totalErrors}
          </p>
        </div>
        <div className="rounded-xl bg-violet-500/5 dark:bg-violet-500/10 p-3 text-center">
          <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-wide font-medium">Agents</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '—' : agents.length}
          </p>
        </div>
        <div className="rounded-xl bg-amber-500/5 dark:bg-amber-500/10 p-3 text-center">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide font-medium">Error Rate</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? '—' : totalCalls > 0 ? `${((totalErrors / totalCalls) * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {agents.length > 0
          ? agents.map((agent) => <AgentCard key={agent.name} agent={agent} />)
          : !isLoading && (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                No agent traces available
              </div>
            )}
      </div>
    </motion.div>
  );
}
