"use client";

import React, { useEffect, useState } from 'react';
import { useRole } from './RoleContext';

export default function TopProgressBar() {
  const { activeTab } = useRole();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Tab switch instant indicator
  useEffect(() => {
    setLoading(true);
    setProgress(35);
    const t1 = setTimeout(() => setProgress(80), 60);
    const t2 = setTimeout(() => {
      setProgress(100);
      const t3 = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(t3);
    }, 180);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeTab]);

  // Network activity indicator
  useEffect(() => {
    let activeRequests = 0;

    const handleStart = () => {
      activeRequests++;
      setLoading(true);
      setProgress((prev) => (prev === 0 ? 30 : Math.min(prev + 20, 85)));
    };

    const handleEnd = () => {
      activeRequests = Math.max(0, activeRequests - 1);
      if (activeRequests === 0) {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 220);
      }
    };

    window.addEventListener('fioner:fetch-start', handleStart);
    window.addEventListener('fioner:fetch-end', handleEnd);

    return () => {
      window.removeEventListener('fioner:fetch-start', handleStart);
      window.removeEventListener('fioner:fetch-end', handleEnd);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none transition-opacity duration-300"
      style={{ opacity: loading ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-sm shadow-blue-500/50 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
