import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, KeyRound, CheckCircle2, X } from 'lucide-react';

export const LoginPage = () => {
  const { signIn, loginAsDemo, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);

    const res = await signIn(email.trim(), password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);

    const res = await resetPassword(forgotEmail);
    setForgotLoading(false);

    if (res.success) {
      setForgotMessage(res.message);
    } else {
      setForgotError(res.error || 'Failed to send reset email.');
    }
  };

  const handleDemoLogin = (personaKey) => {
    loginAsDemo(personaKey);
    navigate('/');
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden"
      style={{ backgroundImage: `url('/family_hero_bg.png')` }}
    >
      {/* Deep Atmospheric Glass Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-emerald-950/60 to-slate-900/80 backdrop-blur-[4px]" />

      {/* Floating Glowing Neon Spheres for Translucent Glass Refraction */}
      <div className="absolute -top-20 -left-20 w-88 h-88 rounded-full bg-emerald-500/30 blur-3xl animate-pulse-subtle pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-teal-400/25 blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl animate-float-reverse pointer-events-none" />

      {/* Ultra Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-[420px] my-auto animate-modal-pop">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900/55 backdrop-blur-3xl p-7 sm:p-9 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] border border-white/20 ring-1 ring-white/10 text-white">
          
          {/* Top Specular Edge Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />
          
          {/* Subtle Inner Glass Glow */}
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

          {/* Brand & Catchy Header */}
          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide shadow-xs mb-3 backdrop-blur-md animate-bounce-subtle">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>TipidLink • Smart Family Finances</span>
            </div>

            <img
              src="/tipidlink-logo.png"
              alt="TipidLink"
              className="h-16 w-auto object-contain mb-2 filter drop-shadow-[0_10px_20px_rgba(16,185,129,0.35)] hover:scale-105 transition-transform duration-300 animate-float"
            />
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 font-medium">
              A shared family budget management platform
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-rose-500/20 backdrop-blur-md p-3 text-xs text-rose-200 border border-rose-500/40 shadow-xs animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Glass Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-emerald-300 rounded-lg transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end -mt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotError('');
                  setForgotMessage('');
                  setIsForgotOpen(true);
                }}
                className="text-xs font-semibold text-emerald-300/90 hover:text-emerald-200 hover:underline transition cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Radiant Glowing Neon Glass Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-5 text-center text-xs text-slate-300">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-extrabold text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              Create a Free Account
            </Link>
          </div>

          {/* Quick Demo Section with Glass Pills */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Quick Demo:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('maria')}
                className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-emerald-300 hover:bg-emerald-500/20 font-bold transition shadow-xs active-press"
                title="Log in as Nanay Maria"
              >
                👩 Maria
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('juan')}
                className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-slate-200 hover:bg-white/20 font-semibold transition shadow-xs active-press"
                title="Log in as Tatay Juan"
              >
                👨 Juan
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('angela')}
                className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-slate-200 hover:bg-white/20 font-semibold transition shadow-xs active-press"
                title="Log in as Angela"
              >
                👧 Angela
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Glass Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900/95 border border-white/20 p-7 shadow-2xl text-white animate-modal-pop">
            <button
              onClick={() => setIsForgotOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Reset Password</h3>
                <p className="text-xs text-slate-300">We will send password reset instructions to your email</p>
              </div>
            </div>

            {forgotMessage ? (
              <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-xs text-emerald-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Email Sent!</span>
                </div>
                <p className="leading-relaxed">{forgotMessage}</p>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="w-full mt-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs text-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
