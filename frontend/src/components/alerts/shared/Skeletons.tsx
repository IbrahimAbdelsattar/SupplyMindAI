import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function CardShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-48" />
      </div>
    </div>
  );
}

export function AlertSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <CardShell key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </CardShell>
      ))}
    </div>
  );
}

export function AlertListSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-64" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function AlertDetailSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-2 w-28" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
