import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../contexts/FinanceContext';
import { isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';
import {
  Database,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Info,
  Users,
} from 'lucide-react';

export const SettingsPage = () => {
  const { resetToDemoData } = useFinance();
  const [resetMessage, setResetMessage] = useState('');

  const config = getSupabaseConfig();

  const handleResetData = () => {
    resetToDemoData();
    setResetMessage('Demo data refreshed successfully!');
    setTimeout(() => setResetMessage(''), 3000);
  };

  const handleClearLocal = () => {
    if (window.confirm('Are you sure you want to clear locally cached data?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Settings & Architecture
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Backend configuration, Supabase Row Level Security (RLS), and college presentation documentation.
        </p>
      </div>

      {resetMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Backend Status Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isSupabaseConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase Backend Connection</h3>
              <p className="text-xs text-slate-500">
                PostgreSQL Database, Supabase Auth & Row Level Security
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isSupabaseConfigured
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {isSupabaseConfigured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
            {isSupabaseConfigured ? 'Connected to Supabase' : 'Interactive Demo Mode Active'}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2 border border-slate-200/60 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">VITE_SUPABASE_URL:</span>
            <span className="text-slate-700 font-semibold truncate max-w-xs">
              {config.url || 'Not set (using offline storage)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">VITE_SUPABASE_PUBLISHABLE_KEY:</span>
            <span className="text-slate-700 font-semibold">
              {config.hasKey ? 'Configured (Active)' : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* SQL Migration & RLS Explanation Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Security & Database Schema</h3>
            <p className="text-xs text-slate-500">
              Normalized schema with non-recursive Row Level Security (RLS)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The project includes a complete migration script located at:
          <br />
          <code className="mt-1 inline-block bg-slate-100 text-emerald-800 px-2 py-1 rounded-md font-mono font-semibold">
            supabase/migrations/001_initial_schema.sql
          </code>
        </p>

        <div className="rounded-2xl bg-slate-900 p-4 text-slate-200 text-xs font-mono overflow-x-auto space-y-2">
          <p className="text-emerald-400 font-bold">-- Non-recursive RLS Membership Function:</p>
          <p className="text-slate-400">CREATE OR REPLACE FUNCTION get_user_household_ids(user_uuid UUID)</p>
          <p className="text-slate-400">RETURNS SETOF UUID AS $$</p>
          <p className="text-slate-300">  SELECT household_id FROM household_members WHERE user_id = user_uuid;</p>
          <p className="text-slate-400">$$ LANGUAGE sql SECURITY DEFINER STABLE;</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Strict data isolation ensures households cannot read or tamper with each other&apos;s financial records.
          </span>
        </div>
      </div>

      {/* Demo Data & Cache Controls */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Demonstration Controls</h3>
        <p className="text-xs text-slate-500">
          Use these controls during your presentation to quickly reset or reload realistic sample data.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Santos Family Demo Records
          </button>

          <button
            onClick={handleClearLocal}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Local Storage
          </button>
        </div>
      </div>

      {/* Presentation Project Credits */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center gap-2.5 mb-3">
          <Users className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-bold">TipidLink Project Development Team</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Based on the TipidLink college project presentation &amp; research:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="font-bold text-white">Kevin Palaca</p>
            <p className="text-[10px] text-emerald-400">Project Lead</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="font-bold text-white">Jhon Eric Granada</p>
            <p className="text-[10px] text-emerald-400">UI/UX &amp; Design</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="font-bold text-white">Miguel James Laput</p>
            <p className="text-[10px] text-emerald-400">Programmer</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="font-bold text-white">Wiljune Baisac</p>
            <p className="text-[10px] text-emerald-400">Marketing &amp; QA</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="font-bold text-white">Jhon Carlo Puclay</p>
            <p className="text-[10px] text-emerald-400">Finance &amp; Business</p>
          </div>
        </div>
      </div>
    </div>
  );
};
