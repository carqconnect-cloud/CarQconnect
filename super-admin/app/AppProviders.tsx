"use client";

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './ThemeContext';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            '!bg-white !text-gray-900 dark:!bg-zinc-900 dark:!text-white border border-gray-200 dark:border-zinc-800 shadow-xl',
          style: {
            borderRadius: '12px',
            fontSize: '13.5px',
          },
        }}
      />
    </ThemeProvider>
  );
}
