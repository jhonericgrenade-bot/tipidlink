import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HouseholdSelector } from './HouseholdSelector';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Receipt,
  PiggyBank,
  Users,
  LogOut,
  Sparkles,
  Database,
  ChevronDown,
  Settings,
} from 'lucide-react';

export const Navbar = ({ onOpenCreateHousehold, onOpenJoinHousehold }) => {
  const { user, profile, isDemoMode, signOut, loginAsDemo } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Bills', path: '/bills', icon: Receipt },
    { name: 'Savings', path: '/savings', icon: PiggyBank },
    { name: 'Family', path: '/household', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Household Switcher */}
        <div className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <img
              src="/tipidlink-logo.png"
              alt="TipidLink Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </NavLink>

          {/* Household Selector */}
          <HouseholdSelector
            onOpenCreateModal={onOpenCreateHousehold}
            onOpenJoinModal={onOpenJoinHousehold}
          />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Right side: Mode Pill + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase or Demo Mode badge */}
          {isDemoMode ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
              <Sparkles className="h-3 w-3 text-amber-600" />
              Demo Mode
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
              <Database className="h-3 w-3 text-emerald-600" />
              Supabase RLS
            </span>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              <img
                src={
                  profile?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    profile?.full_name || user?.email || 'User'
                  )}`
                }
                alt="Profile"
                className="h-8 w-8 rounded-lg object-cover ring-2 ring-emerald-500/20"
              />
              <div className="hidden md:block text-left text-xs">
                <p className="font-bold text-slate-800 leading-tight">
                  {profile?.full_name || 'Family Member'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setProfileOpen(false)}
              >
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{profile?.full_name || 'Member'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  {isDemoMode && (
                    <span className="mt-1 inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Interactive Showcase
                    </span>
                  )}
                </div>

                {isDemoMode && (
                  <div className="px-2 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                      Switch Demo Family Persona
                    </p>
                    <button
                      onClick={() => {
                        loginAsDemo('maria');
                        setProfileOpen(false);
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                    >
                      👩 Maria Santos (Budget Manager)
                    </button>
                    <button
                      onClick={() => {
                        loginAsDemo('juan');
                        setProfileOpen(false);
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                    >
                      👨 Juan Santos (Breadwinner)
                    </button>
                    <button
                      onClick={() => {
                        loginAsDemo('angela');
                        setProfileOpen(false);
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                    >
                      👧 Angela Santos (Working Student)
                    </button>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Supabase & App Settings
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
