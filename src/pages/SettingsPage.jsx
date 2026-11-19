import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useFinance } from '../contexts/FinanceContext';
import { usePremium } from '../contexts/PremiumContext';
import { isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';
import {
  exportToJSON,
  printFinancialStatement,
  exportFullFinancialStatementPDF,
  exportTransactionsPDF,
  exportBudgetsPDF,
  exportBillsPDF,
  exportSavingsPDF,
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
  FileJson,
  Printer,
  ArrowDownToLine,
  FileText,
  Smartphone,
  Apple,
  LogOut,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user, profile, updatePassword, isDemoMode, signOut } = useAuth();
  const { currentUserRole, currentHousehold } = useHousehold();
  const {
    ledgerTransactions: transactions,
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

  const handleResetData = () => {
    const result = resetToDemoData();
    if (!result?.success) {
      setResetMessage(result?.error || 'Demo data could not be reloaded.');
      return;
    }
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

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              isPremium ? 'bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs' : 'bg-slate-100 text-slate-700'
            }`}>
              <Crown className="h-3.5 w-3.5 text-amber-500 fill-current" />
              <span>{isPremium ? (currentHousehold?.name ? `Pro (${currentHousehold.name})` : 'Pro Household Plan') : 'Free Plan'}</span>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
              title="Mag-log out sa kasalukuyang session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
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

          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Secure account recovery</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Password recovery uses a verified link sent to your registered email. Four-digit PIN and family-code recovery are disabled to protect your account.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile App Installation Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 shadow-md border border-emerald-500/30 text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-950/40">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/20 mb-1">
                <Sparkles className="h-2.5 w-2.5" />
                <span>PWA & Native Mobile Ready</span>
              </div>
              <h3 className="text-base font-black text-white">
                Install TipidLink on Phone (Android & iOS)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                Add TipidLink directly to your mobile home screen with a custom app icon for 1-tap offline-ready access without downloading from app stores.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/presentation-video.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>▶ Play Video Demo</span>
            </a>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('tipidlink-open-install-modal'));
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 text-xs font-black shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Open Install Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Export & Backup Center Card */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Export & Backup Center</h3>
              <p className="text-xs text-slate-500">
                Download formatted PDF reports (iOS, Android, PC) or complete household JSON backups.
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
          {/* 1. All-in-One Formatted PDF Statement */}
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-4 flex flex-col justify-between space-y-3 hover-lift-subtle">
            <div>
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <FileText className="h-4 w-4 text-rose-600" />
                <span>Executive Statement (PDF)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Multi-page official financial audit with Executive Summary, Budgets, Bills, Savings Goals, and Cashflow.
              </p>
            </div>
            <button
              onClick={async () => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                setExportLoading(true);
                try {
                  await exportFullFinancialStatementPDF({
                    household: currentHousehold,
                    calculations,
                    transactions,
                    budgets,
                    bills,
                    savingsGoals,
                    categories,
                    month: selectedMonth,
                    year: selectedYear,
                  });
                  setExportStatus('Executive PDF generated!');
                  setTimeout(() => setExportStatus(''), 4000);
                } catch (err) {
                  alert(`PDF error: ${err.message}`);
                } finally {
                  setExportLoading(false);
                }
              }}
              disabled={exportLoading}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-xs active-press transition cursor-pointer disabled:opacity-50 ${
                isPremium
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 shadow-md ring-2 ring-amber-300/50'
              }`}
            >
              {isPremium ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Crown className="h-4 w-4 fill-slate-900 text-slate-900" />
              )}
              <span>{isPremium ? 'Download Full PDF' : 'Download Full PDF (₱30 Pro)'}</span>
            </button>
          </div>

          {/* 2. Print / System PDF Dialog */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3 hover-lift-subtle">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Printer className="h-4 w-4 text-emerald-600" />
                <span>Print / Save as PDF</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Opens your browser or device print dialog to print directly to paper or save as a local PDF document.
              </p>
            </div>
            <button
              onClick={() => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                printFinancialStatement();
                setExportStatus('Print dialog opened');
                setTimeout(() => setExportStatus(''), 4000);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold shadow-xs active-press transition cursor-pointer ${
                isPremium
                  ? 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                  : 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300/60'
              }`}
            >
              {isPremium ? (
                <Printer className="h-3.5 w-3.5" />
              ) : (
                <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              )}
              <span>{isPremium ? 'Print / Save as PDF' : 'Print / Save PDF (₱30 Pro)'}</span>
            </button>
          </div>

          {/* 3. Complete Household JSON Backup */}
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 active-press transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Download Backup (JSON)</span>
            </button>
          </div>
        </div>

        {/* Quick Export PDF Modules */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-rose-600" />
              Quick Module PDF Statements (Direct Download):
            </span>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                <Crown className="h-3 w-3 fill-amber-500 text-amber-500" />
                ₱30 Pro Feature
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                exportTransactionsPDF(transactions, currentHousehold?.name || 'Household');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold active-press transition cursor-pointer ${
                isPremium
                  ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
                  : 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {isPremium ? <FileText className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />}
              <span>{isPremium ? 'Transactions PDF' : 'Transactions (Pro)'}</span>
            </button>
            <button
              onClick={() => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                exportBudgetsPDF({
                  budgets,
                  categories,
                  transactions,
                  householdName: currentHousehold?.name || 'Household',
                  month: selectedMonth,
                  year: selectedYear,
                  overallMonthlyTarget: currentHousehold?.monthly_budget_target || calculations.activeBudgetTarget || 0,
                });
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold active-press transition cursor-pointer ${
                isPremium
                  ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
                  : 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {isPremium ? <FileText className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />}
              <span>{isPremium ? 'Budgets PDF' : 'Budgets (Pro)'}</span>
            </button>
            <button
              onClick={() => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                exportBillsPDF(bills, currentHousehold?.name || 'Household');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold active-press transition cursor-pointer ${
                isPremium
                  ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
                  : 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {isPremium ? <FileText className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />}
              <span>{isPremium ? 'Bills PDF' : 'Bills (Pro)'}</span>
            </button>
            <button
              onClick={() => {
                if (!isPremium) {
                  openUpgradeModal();
                  return;
                }
                exportSavingsPDF(savingsGoals, currentHousehold?.name || 'Household');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold active-press transition cursor-pointer ${
                isPremium
                  ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
                  : 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {isPremium ? <FileText className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />}
              <span>{isPremium ? 'Savings PDF' : 'Savings (Pro)'}</span>
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
          {isDemoMode && (
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Santos Family Demo Records
            </button>
          )}

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
                  <td className="p-3 text-slate-600">Simple daily expense recording with GCash/Cash/Maya support & PDF export</td>
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

      {/* Session Management & Quick Log Out */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Session &amp; Account Sign Out</h4>
          <p className="text-xs text-slate-500">
            Sign out of your active TipidLink session on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out / Mag-log out</span>
        </button>
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
