import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Sparkles, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';

export const RegisterPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    const res = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Account created successfully! Redirecting to dashboard...');
      setTimeout(() => navigate('/'), 1200);
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center px-4 py-6 sm:p-6 relative select-none"
      style={{ backgroundImage: `url('/family_hero_bg.png')` }}
    >
      {/* Subtle warm backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/20 to-slate-900/40 backdrop-blur-[2px]" />

      {/* Main Glassmorphism Mobile Card */}
      <div className="relative z-10 w-full max-w-[420px] my-auto">
        {/* Top Header Badge */}
        <div className="flex justify-center mb-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 backdrop-blur-md px-3.5 py-1 text-[11px] font-bold text-white shadow-md shadow-emerald-950/20 border border-emerald-400/30">
            <Sparkles className="h-3 w-3 text-emerald-200" />
            <span>Shared Family Budget Platform</span>
          </div>
        </div>

        {/* Floating Card */}
        <div className="bg-white/95 sm:bg-white/90 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 ring-1 ring-slate-900/5">
          {/* Logo & Headline */}
          <div className="flex flex-col items-center text-center mb-4">
            <img
              src="/tipidlink-logo.png"
              alt="TipidLink"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs mb-1 hover:scale-105 transition-transform"
            />
            <p className="text-xs text-slate-500 font-medium">
              Create an account for your household
            </p>
          </div>

          {/* Segmented Tab Bar (Sign In / Register) */}
          <div className="grid grid-cols-2 p-1 mb-4 rounded-2xl bg-slate-100/90 border border-slate-200/70 text-xs font-bold">
            <Link
              to="/login"
              className="py-2 rounded-xl text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition text-center"
            >
              <span>Sign In</span>
            </Link>
            <button
              type="button"
              className="py-2 rounded-xl bg-white text-emerald-800 shadow-xs border border-slate-200/50 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
              <span>Register</span>
            </button>
          </div>

          {/* Feedback Notices */}
          {error && (
            <div className="mb-3.5 flex items-start gap-2.5 rounded-2xl bg-rose-50/95 p-3 text-xs text-rose-700 border border-rose-200 shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-3.5 flex items-center gap-2 rounded-2xl bg-emerald-50/95 p-3 text-xs text-emerald-800 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="e.g. maria.santos@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Accepts any personal email (Gmail, Yahoo, Outlook, etc.)</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    required
                    placeholder="Min. 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] transition-all disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
