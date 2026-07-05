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

export function MorningBriefSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="flex flex-wrap gap-4 sm:gap-8 items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        <div className="flex gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

export function CriticalAlertsSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border-l-4 border-l-slate-200 dark:border-l-slate-700 bg-white dark:bg-slate-900/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-full mb-2" />
            <Skeleton className="h-2.5 w-3/4" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function RecommendedActionsSkeleton() {
  return (
    <div>
      <div className="mb-4">
        <Skeleton className="h-3.5 w-44 mb-1" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-200 dark:border-l-slate-700 p-4 shadow-sm bg-white dark:bg-slate-900/80">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-2.5 w-full mb-1.5" />
            <Skeleton className="h-2.5 w-2/3 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusinessHealthSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-2 w-24 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function SupplyChainMapSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="relative h-[200px] w-full">
        <Skeleton className="absolute inset-0 rounded-xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </CardShell>
  );
}

export function ExecutiveTimelineSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <Skeleton className="w-3 h-3 rounded-full flex-shrink-0" />
              {i < 3 && <Skeleton className="w-px flex-1 min-h-[24px]" />}
            </div>
            <div className="pb-4 flex-1">
              <Skeleton className="h-2 w-14 mb-1" />
              <Skeleton className="h-3 w-40 mb-1" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

export function AskCopilotSkeleton() {
  return (
    <CardShell>
      <HeaderSkeleton />
      <div className="space-y-3 mb-4 h-[320px]">
        {[0, 1].map((i) => (
          <div key={i} className={`flex ${i === 0 ? 'justify-end' : 'justify-start'}`}>
            <Skeleton className={`h-10 rounded-2xl ${i === 0 ? 'w-3/5' : 'w-2/5'}`} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="flex-1 h-10 rounded-xl" />
        <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
      </div>
    </CardShell>
  );
}
