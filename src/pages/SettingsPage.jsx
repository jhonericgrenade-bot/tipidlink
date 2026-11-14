import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useFinance } from '../contexts/FinanceContext';
import { usePremium } from '../contexts/PremiumContext';
import { isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';
import {
  exportToCSV,
  exportToJSON,
  printFinancialStatement,
  exportTransactionsCSV,
  exportBudgetsCSV,
  exportBillsCSV,
  exportSavingsCSV,
} from '../lib/exportUtils';
import {
  Database,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Info,
  Users,
  Crown,
  Building2,
  Sparkles,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  UserCheck,
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  ArrowDownToLine,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user, profile, updatePassword, updateSecurityPin, isDemoMode } = useAuth();
  const { currentUserRole, currentHousehold } = useHousehold();
  const {
    transactions,
    budgets,
    bills,
    savingsGoals,
    categories,
    calculations,
    selectedMonth,
    selectedYear,
    resetToDemoData,
  } = useFinance();
  const { isPremium, premiumPlan, sponsorDetails, openUpgradeModal } = usePremium();

  const [resetMessage, setResetMessage] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  // Password Management State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Security PIN State
  const [newPin, setNewPin] = useState('');
  const [showSettingsPin, setShowSettingsPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const config = getSupabaseConfig();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordSuccess(res.message);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password.');
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('Ang PIN ay dapat 4 na numero (hal. 1234).');
      return;
    }
    setPinLoading(true);
    const res = await updateSecurityPin(newPin);
    setPinLoading(false);
    if (res.success) {
      setPinSuccess(res.message);
      setNewPin('');
      setTimeout(() => setPinSuccess(''), 4000);
    } else {
      setPinError(res.error || 'Failed to update PIN.');
    }
  };

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
    <div className="space-y-6 pb-20 lg:pb-12 max-w-4xl mx-auto animate-page-enter">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Account & System Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Account security, password management, backend status, and college presentation documentation.
        </p>
      </div>

      {resetMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Account Security & Password Management Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Account & Security</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {currentUserRole || 'Member'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {profile?.full_name || user?.user_metadata?.full_name || 'Account User'} • {user?.email || profile?.email || 'demo@tipidlink.ph'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              isPremium ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'
            }`}>
              <Crown className="h-3.5 w-3.5 text-amber-500 fill-current" />
              <span>{isPremium ? 'Pro Account' : 'Free Plan'}</span>
            </span>
          </div>
        </div>

        {/* Password Alerts */}
        {passwordSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{passwordError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Form: Change Password Direct */}
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-0.5">Change Password</h4>
              <p className="text-xs text-slate-400">Update your login password to keep your account safe.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                New Password (Min. 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press transition cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          {/* Option 2: 4-Digit Security PIN (Direct Recovery) */}
          <form onSubmit={handleUpdatePin} className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>4-Digit Security PIN</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                  PIN: {profile?.security_pin || '0000'}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Use this 4-digit PIN for instant password recovery without needing email access.
              </p>

              {pinSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 animate-fade-in font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              {pinError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200 animate-fade-in font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change 4-Digit Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showSettingsPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Enter new 4-digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs tracking-widest font-mono font-bold focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSettingsPin(!showSettingsPin)}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-emerald-600 rounded-lg transition"
                  >
                    {showSettingsPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={pinLoading || newPin.length !== 4}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 active-press transition cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{pinLoading ? 'Saving...' : 'Update Security PIN'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Data Export & Backup Center Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 shadow-xs">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Export & Backup Center</h3>
              <p className="text-xs text-slate-500">
                Export family records to Excel / CSV, download full JSON backups, or print statements. Compatible with PC, iOS, and Android.
              </p>
            </div>
          </div>

          {exportStatus && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{exportStatus}</span>
            </div>
          )}
        </div>

        {/* Primary Export Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. All-in-One Consolidated CSV */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3 hover-lift-subtle">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Full Financial CSV</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Consolidates all transactions, active budgets, household bills, and savings goals into one Excel-ready sheet.
              </p>
            </div>
            <button
              onClick={async () => {
                setExportLoading(true);
                try {
                  const dateStr = new Date().toISOString().split('T')[0];
                  const householdName = currentHousehold?.name || 'Household';
                  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                  const filename = `tipidlink_full_statement_${safeName}_${dateStr}.csv`;

                  const headers = [
                    'Record Type',
                    'Date / Period',
                    'Title / Description',
                    'Category / Biller',
                    'Amount (PHP)',
                    'Status / Method',
                    'Details / Logged By',
                    'Notes'
                  ];

                  const rows = [];
                  transactions.forEach(t => {
                    rows.push([
                      'TRANSACTION',
                      t.transaction_date || '',
                      t.description || '',
                      t.category_name || t.categories?.name || 'General',
                      t.amount || 0,
                      `${(t.type || 'expense').toUpperCase()} (${(t.payment_method || 'cash').toUpperCase()})`,
                      t.user_name || t.profiles?.full_name || 'Member',
                      t.notes || ''
                    ]);
                  });

                  budgets.forEach(b => {
                    const cat = categories.find(c => c.id === b.category_id);
                    rows.push([
                      'BUDGET LIMIT',
                      `${selectedMonth}/${selectedYear}`,
                      `Budget Limit for ${cat?.name || 'Category'}`,
                      cat?.name || 'Category',
                      b.amount || 0,
                      'ALLOCATED',
                      `Month: ${selectedMonth}, Year: ${selectedYear}`,
                      ''
                    ]);
                  });

                  bills.forEach(b => {
                    const totalPaid = (b.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
                    const remaining = Math.max(0, Number(b.amount) - totalPaid);
                    rows.push([
                      'BILL OBLIGATION',
                      b.due_date || '',
                      b.title || 'Untitled Bill',
                      b.biller_name || 'Biller',
                      b.amount || 0,
                      remaining <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'),
                      `Paid: ₱${totalPaid} | Balance: ₱${remaining}`,
                      b.notes || ''
                    ]);
                  });

                  savingsGoals.forEach(g => {
                    rows.push([
                      'SAVINGS GOAL',
                      g.target_date || 'Ongoing',
                      g.name || 'Savings Goal',
                      g.category || 'General',
                      g.target_amount || 0,
                      Number(g.current_amount) >= Number(g.target_amount) ? 'COMPLETED' : 'IN PROGRESS',
                      `Saved: ₱${g.current_amount || 0}`,
                      g.description || ''
                    ]);
                  });

                  await exportToCSV({
                    filename,
                    headers,
                    rows,
                    title: `${householdName} - Consolidated Financial Statement`,
                  });
                  setExportStatus('Consolidated CSV exported!');
                  setTimeout(() => setExportStatus(''), 4000);
                } catch (err) {
                  alert(`Export error: ${err.message}`);
                } finally {
                  setExportLoading(false);
                }
              }}
              disabled={exportLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Full CSV</span>
            </button>
          </div>

          {/* 2. Complete Household JSON Backup */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3 hover-lift-subtle">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <FileJson className="h-4 w-4 text-indigo-600" />
                <span>JSON Data Backup</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Raw database snapshot of your entire family household records for offline safekeeping or system migration.
              </p>
            </div>
            <button
              onClick={async () => {
                setExportLoading(true);
                try {
                  const dateStr = new Date().toISOString().split('T')[0];
                  const householdName = currentHousehold?.name || 'Household';
                  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                  const filename = `tipidlink_backup_${safeName}_${dateStr}.json`;

                  const backupData = {
                    app: 'TipidLink',
                    version: '2.0',
                    exported_at: new Date().toISOString(),
                    household: currentHousehold,
                    transactions,
                    budgets,
                    bills,
                    savings_goals: savingsGoals,
                    categories,
                  };

                  await exportToJSON({
                    filename,
                    data: backupData,
                    title: `${householdName} - Complete Household Backup`,
                  });
                  setExportStatus('JSON backup downloaded!');
                  setTimeout(() => setExportStatus(''), 4000);
                } catch (err) {
                  alert(`Backup error: ${err.message}`);
                } finally {
                  setExportLoading(false);
                }
              }}
              disabled={exportLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 active-press transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Download Backup (JSON)</span>
            </button>
          </div>

          {/* 3. Printable Financial Statement */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3 hover-lift-subtle">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Printer className="h-4 w-4 text-teal-600" />
                <span>Print / Save as PDF</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Clean document layout formatted for desktop and mobile printing or instant &ldquo;Save as PDF&rdquo;.
              </p>
            </div>
            <button
              onClick={() => {
                printFinancialStatement();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 active-press transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-teal-600" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Export Individual Modules */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-600">Quick module exports:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportTransactionsCSV(transactions, currentHousehold?.name || 'Household')}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              Transactions CSV
            </button>
            <button
              onClick={() => exportBudgetsCSV({
                budgets,
                categories,
                transactions,
                householdName: currentHousehold?.name || 'Household',
                month: selectedMonth,
                year: selectedYear,
                overallMonthlyTarget: currentHousehold?.monthly_budget_target || calculations.activeBudgetTarget || 0,
              })}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              Budgets CSV
            </button>
            <button
              onClick={() => exportBillsCSV(bills, currentHousehold?.name || 'Household')}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              Bills CSV
            </button>
            <button
              onClick={() => exportSavingsCSV(savingsGoals, currentHousehold?.name || 'Household')}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              Savings CSV
            </button>
          </div>
        </div>
      </div>

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

      {/* Presentation Defense Hub: Business Model (Slide 06) */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 mb-1">
              <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              Presentation Slide 06: Business Model
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Our Competitive Advantage &amp; Pricing Structure
            </h3>
            <p className="text-xs text-slate-500">
              &ldquo;Unlike most personal finance apps, TipidLink makes budgeting a shared family activity.&rdquo;
            </p>
          </div>

          <button
            onClick={openUpgradeModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Crown className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>Open Interactive Subscription Modal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">📊</span>
              <span>Shared Household View</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              One shared dashboard for the family&apos;s income, expenses, bills, and remaining budget in Philippine Peso (₱).
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">👨‍👩‍👧‍👦</span>
              <span>Built for Family Collaboration</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Parents, breadwinners, students, and family members can contribute and stay updated in real-time with role-based access.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <span className="h-7 w-7 rounded-lg bg-emerald-200 flex items-center justify-center text-sm">🤝</span>
              <span>Affordable &amp; Community-Based</span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              <strong>PHP 30 premium plan</strong> plus sponsored access through cooperatives, schools, barangays, LGUs, and NGOs.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 p-3 text-center text-xs font-semibold text-emerald-300">
          Tagline: &ldquo;One household. One shared budget. Better money habits.&rdquo;
        </div>
      </div>

      {/* College Presentation: Feature & Competitor Matrix (from TipidLink.pptx) */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 mb-1">
              <CheckCircle2 className="h-3 w-3" />
              100% Aligned with Presentation Slides
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Presentation Defense Hub: Feature & Competitor Comparison
            </h3>
            <p className="text-xs text-slate-500">
              Direct alignment with the official TipidLink presentation slides for panelist evaluation.
            </p>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Feature Comparison Matrix
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3 text-center bg-emerald-700 text-white">Our App (TipidLink)</th>
                  <th className="p-3 text-center text-slate-300">YNAB</th>
                  <th className="p-3 text-center text-slate-300">Goodbudget</th>
                  <th className="p-3 text-center text-slate-300">Honeydue</th>
                  <th className="p-3">Our Advantage & Implementation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Family-focused</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-slate-600">Designed around household use (Family Hub, Invite Codes, Roles)</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Shared expenses</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-slate-600">Built for shared family expenses (real-time sync across members)</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Expense tracking</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-slate-600">Simple daily expense recording with GCash/Cash/Maya support & CSV export</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Bill/payment tracking</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-slate-600">Keeps household payments visible with due date countdown & partial payment logs</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Remaining budget</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-slate-600">Clear view of available budget with % utilization bar & overspending warnings</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Savings focus</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-slate-600">Encourages better saving habits via Pondong Pang-ipit & goal milestones</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Beginner-friendly</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-slate-600">Simple and focused workflow without complex financial accounting jargon</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">Filipino household focus</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-400">—</td>
                  <td className="p-3 text-center text-slate-400">—</td>
                  <td className="p-3 text-center text-slate-400">—</td>
                  <td className="p-3 text-slate-600">Localized in ₱, Palengke, Meralco, Maynilad, OFW Padala, and Sari-Sari Store</td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">All-in-one family view</td>
                  <td className="p-3 text-center text-emerald-600 font-bold bg-emerald-50/50">✓ Implemented</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-slate-500">✓</td>
                  <td className="p-3 text-center text-amber-500">⚠️</td>
                  <td className="p-3 text-slate-600">One shared dashboard consolidating Income, Expenses, Bills, and Ipon</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitor Overview Accordion / Summary */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Competitor Advantage Summary
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <span className="font-bold text-slate-900">Splitwise vs TipidLink</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Splitwise only splits bills between friends. TipidLink tracks the entire shared household budget, utility bills, and savings goals.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <span className="font-bold text-slate-900">YNAB vs TipidLink</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                YNAB uses strict zero-based accounting with steep learning curve. TipidLink uses a simpler family-centered approach tailored for Filipino households.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <span className="font-bold text-slate-900">Honeydue vs TipidLink</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Honeydue is strictly for couples. TipidLink is built for multi-member Filipino families (Nanay, Tatay, mga anak, at kamag-anak).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <span className="font-bold text-slate-900">Goodbudget / Spendee vs TipidLink</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                TipidLink offers Filipino localization (Philippine Peso ₱, Meralco/Maynilad/GCash) and full partial bill payment tracking.
              </p>
            </div>
          </div>
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
