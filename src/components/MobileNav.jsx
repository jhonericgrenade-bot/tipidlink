import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Receipt,
  PiggyBank,
  Users,
} from 'lucide-react';

export const MobileNav = () => {
  const tabs = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Expenses', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Bills', path: '/bills', icon: Receipt },
    { name: 'Savings', path: '/savings', icon: PiggyBank },
    { name: 'Family', path: '/household', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-slate-200/90 bg-white/95 backdrop-blur-md lg:hidden">
      <div className="grid h-16 grid-cols-6 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition ${
                  isActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] tracking-tight">{tab.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
