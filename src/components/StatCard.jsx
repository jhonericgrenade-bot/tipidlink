import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'emerald', // emerald, sky, amber, rose, purple
  isAlert = false,
  badgeText,
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      border: 'border-emerald-200/60',
    },
    sky: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      iconBg: 'bg-sky-500/10 text-sky-600',
      border: 'border-sky-200/60',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      iconBg: 'bg-amber-500/10 text-amber-600',
      border: 'border-amber-200/60',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      iconBg: 'bg-rose-500/10 text-rose-600',
      border: 'border-rose-200/60',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      iconBg: 'bg-purple-500/10 text-purple-600',
      border: 'border-purple-200/60',
    },
  };

  const style = colorStyles[colorScheme] || colorStyles.emerald;

  return (
    <div
      className={`group rounded-2xl bg-white p-5 shadow-xs border transition-all duration-300 hover-lift ${
        isAlert ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h4 className={`text-2xl font-extrabold tracking-tight ${isAlert ? 'text-rose-600' : 'text-slate-900'}`}>
          {value}
        </h4>
        {badgeText && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 animate-pulse-subtle">
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-slate-700">{trend}</span>}
        </div>
      )}
    </div>
  );
};
