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
  className = '',
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-500/5',
      text: 'text-emerald-700',
      iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/30',
      border: 'hover:border-emerald-300',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    sky: {
      bg: 'bg-sky-500/5',
      text: 'text-sky-700',
      iconBg: 'bg-gradient-to-tr from-sky-500 to-blue-400 text-white shadow-sky-500/30',
      border: 'hover:border-sky-300',
      glow: 'group-hover:shadow-sky-500/10',
    },
    amber: {
      bg: 'bg-amber-500/5',
      text: 'text-amber-700',
      iconBg: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/30',
      border: 'hover:border-amber-300',
      glow: 'group-hover:shadow-amber-500/10',
    },
    rose: {
      bg: 'bg-rose-500/5',
      text: 'text-rose-700',
      iconBg: 'bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-rose-500/30',
      border: 'hover:border-rose-300',
      glow: 'group-hover:shadow-rose-500/10',
    },
    purple: {
      bg: 'bg-purple-500/5',
      text: 'text-purple-700',
      iconBg: 'bg-gradient-to-tr from-purple-500 to-indigo-400 text-white shadow-purple-500/30',
      border: 'hover:border-purple-300',
      glow: 'group-hover:shadow-purple-500/10',
    },
  };

  const style = colorStyles[colorScheme] || colorStyles.emerald;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-xs border transition-all duration-300 hover-lift ${
        isAlert
          ? 'border-rose-300 ring-2 ring-rose-200/60 bg-rose-50/20'
          : `border-slate-200/80 ${style.border} ${style.glow}`
      } ${className}`}
    >
      {/* Decorative top ambient color wash on hover */}
      <div className={`absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 rounded-full ${style.bg} blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-100 pointer-events-none`} />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</span>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="relative z-10 mt-3.5 flex items-baseline gap-2.5">
        <h4 className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors duration-200 ${isAlert ? 'text-rose-600' : 'text-slate-900 group-hover:text-emerald-950'}`}>
          {value}
        </h4>
        {badgeText && (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 animate-pulse-subtle">
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="relative z-10 mt-2.5 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="truncate pr-2">{subtitle}</span>
          {trend && <span className="shrink-0 font-bold text-slate-700">{trend}</span>}
        </div>
      )}
    </div>
  );
};
