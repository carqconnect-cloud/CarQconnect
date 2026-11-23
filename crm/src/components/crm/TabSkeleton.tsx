"use client";

import React from 'react';

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded w-24 mb-3" />
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-zinc-800" />
      </div>
      <div className="h-7 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm animate-pulse mt-4">
      {/* Table Head */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-gray-200 dark:bg-zinc-700 rounded"
            style={{ width: i === 0 ? '30%' : i === 1 ? '25%' : '15%' }}
          />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-6 py-4.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-gray-100 dark:bg-zinc-800 rounded"
                style={{ width: c === 0 ? '28%' : c === 1 ? '24%' : '14%' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TabSkeleton({ title = "Loading page..." }: { title?: string }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-48 animate-pulse" />
          <div className="h-3.5 bg-gray-100 dark:bg-zinc-800/60 rounded w-64 animate-pulse" />
        </div>
        <div className="h-9 bg-gray-200 dark:bg-zinc-800 rounded-lg w-28 animate-pulse" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main Table Skeleton */}
      <TableSkeleton rows={7} cols={5} />
    </div>
  );
}
