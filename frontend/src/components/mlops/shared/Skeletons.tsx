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

export function ModelStatusSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <CardShell key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
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

export function LangSmithSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center space-y-2">
            <Skeleton className="h-2 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-48" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {[0, 1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-12 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function AccuracyChartSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <Skeleton className="h-52 sm:h-80 w-full rounded-xl" />
    </CardShell>
  );
}

export function DriftMonitorSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 w-40" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function RetrainingHistorySkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-5 w-14 rounded-full ml-auto" />
              <Skeleton className="h-2 w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function SystemResourcesSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function ModelRegistrySkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-4 px-4 py-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
    </CardShell>
  );
}
