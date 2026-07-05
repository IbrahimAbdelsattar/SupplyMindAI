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

export function ReportOverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <CardShell key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </CardShell>
      ))}
    </div>
  );
}

export function ReportCategoriesSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function ReportGeneratorSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-8 w-24 mt-2" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function RecentReportsSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-2.5 w-56" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function ExecutiveSummarySkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center space-y-2">
            <Skeleton className="w-8 h-8 rounded-full mx-auto" />
            <Skeleton className="h-6 w-16 mx-auto" />
            <Skeleton className="h-2.5 w-20 mx-auto" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </CardShell>
  );
}

export function ReportInsightsSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3">
            <div className="flex items-start gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
