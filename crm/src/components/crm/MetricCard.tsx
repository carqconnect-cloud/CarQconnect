import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  colorClass?: string;
}

const MetricCard = ({ title, value, icon: Icon, trend, trendLabel, colorClass = "text-blue-600" }: MetricCardProps) => {
  const isPositive = trend && trend > 0;
  
  // Extract just the text color from colorClass
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-') && !c.includes('dark:')) || 'text-blue-600';
  const darkTextColor = colorClass.split(' ').find(c => c.startsWith('dark:text-')) || 'dark:text-blue-400';
  const baseColor = textColor.split('-')[1] || 'blue';
  
  return (
    <div className={`bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-${baseColor}-500 flex flex-col justify-between h-full overflow-hidden transition-all`}>
      <div className={`flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 ${textColor} ${darkTextColor}`}>
        <Icon size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
        <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{title}</h3>
      </div>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      
      {trend !== undefined && (
        <div className="mt-2 sm:mt-4 flex items-center text-[11px] sm:text-xs flex-wrap gap-1">
          <span className={`flex items-center font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? <ArrowUpRight size={14} className="mr-0.5 sm:mr-1" /> : <ArrowDownRight size={14} className="mr-0.5 sm:mr-1" />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-gray-500 dark:text-zinc-500 truncate">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
