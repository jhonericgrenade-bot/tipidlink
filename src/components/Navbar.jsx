import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
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
  Crown,
  Smartphone,
} from 'lucide-react';

export const Navbar = ({ onOpenCreateHousehold, onOpenJoinHousehold }) => {
  const { user, profile, isDemoMode, signOut, loginAsDemo } = useAuth();
  const { isPremium, openUpgradeModal } = usePremium();
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
      <div className="mx-auto flex h-16 max-w-[1600px] w-full items-center justify-between px-3 sm:px-5 lg:px-6">
        {/* Left section: Brand Logo, Household Selector, & Desktop Navigation Links (Unified flow prevents overlaps) */}
        <div className="flex items-center flex-nowrap gap-2 sm:gap-3 lg:gap-3 xl:gap-5 min-w-0">
          <NavLink to="/" className="flex items-center gap-2 group shrink-0" title="TipidLink Dashboard" aria-label="TipidLink Dashboard">
            <img
              src="/tipidlink-logo.png"
              alt="TipidLink Logo"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </NavLink>

          {/* Household Selector */}
          <HouseholdSelector
            onOpenCreateModal={onOpenCreateHousehold}
            onOpenJoinModal={onOpenJoinHousehold}
          />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center flex-nowrap gap-0.5 xl:gap-1 min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 xl:gap-2 rounded-xl px-2 xl:px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right side: Mode Pill + Premium + Profile + Quick Mobile Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {/* Install App on Phone Button - Shown on ultra-wide screens (2xl+); always accessible in Profile menu */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tipidlink-open-install-modal'));
              }
            }}
            className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs hover:bg-slate-800 cursor-pointer shrink-0"
            title="Install TipidLink app on your phone (Android & iOS)"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Install App</span>
          </button>

          {/* PHP 30 Premium Plan Button / Active Badge */}
          <button
            onClick={openUpgradeModal}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 border ${
              isPremium
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 hover:from-amber-600 hover:to-amber-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
            title="TipidLink Business Model: ₱30 Premium Plan & Community Access"
          >
            <Crown className={`h-3.5 w-3.5 shrink-0 ${isPremium ? 'fill-white text-white' : 'text-amber-500 fill-amber-500'}`} />
            <span className="hidden sm:inline">{isPremium ? 'Premium Active' : '₱30 Premium'}</span>
            <span className="sm:hidden inline-block min-w-[24px] text-center">{isPremium ? 'Pro' : '₱30'}</span>
          </button>

          {/* Supabase or Demo Mode badge */}
          {isDemoMode ? (
            <span className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200 shrink-0">
              <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
              <span>Demo Mode</span>
            </span>
          ) : (
            <span className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200 shrink-0">
              <Database className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Supabase RLS</span>
            </span>
          )}

          {/* Quick Direct Mobile Sign Out Button - 1-tap Logout on Mobile, Zero Swiping Needed */}
          <button
            onClick={signOut}
            className="sm:hidden inline-flex items-center justify-center h-8 w-8 rounded-xl text-rose-600 hover:bg-rose-50 active:scale-95 transition border border-rose-200/80 bg-rose-50/60 cursor-pointer shrink-0"
            title="Sign Out / Mag-log out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl p-1 sm:p-1.5 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
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
              <>
                {/* Backdrop on mobile to easily close menu by tapping anywhere */}
                <div
                  className="fixed inset-0 z-40 bg-slate-900/20 sm:hidden"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95"
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
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('tipidlink-open-install-modal'));
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>Install Mobile App (Android/iOS)</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      openUpgradeModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                  >
                    <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span>Business Model (₱30 Plan)</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
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
            </>
          )}
        </div>
        </div>
      </div>
    </header>
  );
};
