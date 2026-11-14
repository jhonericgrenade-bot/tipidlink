import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, KeyRound, CheckCircle2, X } from 'lucide-react';

export const LoginPage = () => {
  const { signIn, signInWithPin, loginAsDemo, resetPasswordWithPin } = useAuth();
  const navigate = useNavigate();

  // Mode: 'pin' or 'password' (defaults to 'pin' for ultra-fast, direct login)
  const [loginMode, setLoginMode] = useState('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password modal state (Option 1: In-App 4-Digit Security PIN)
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPin, setForgotPin] = useState('0000');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Pakilagay ang iyong email address.');
      return;
    }

    setError('');
    setLoading(true);

    if (loginMode === 'pin') {
      const cleanPin = (pinInput || '0000').trim();
      if (cleanPin.length !== 4) {
        setError('Pakilagay ang 4-digit PIN (default: 0000).');
        setLoading(false);
        return;
      }
      const res = await signInWithPin(email.trim(), cleanPin);
      setLoading(false);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Hindi makapag-log in gamit ang PIN.');
      }
    } else {
      if (!password) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }
      const res = await signIn(email.trim(), password);
      setLoading(false);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    }
  };

  const handleForgotWithPin = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Pakilagay ang iyong rehistradong email address.');
      return;
    }
    if (!forgotPin.trim() || forgotPin.trim().length !== 4) {
      setForgotError('Pakilagay ang 4-digit Security PIN (default: 0000).');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError('Ang bagong password ay dapat hindi bababa sa 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(forgotNewPassword)) {
      setForgotError('Kailangan ay may kahit isang uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(forgotNewPassword)) {
      setForgotError('Kailangan ay may kahit isang lowercase letter (a-z).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(forgotNewPassword)) {
      setForgotError('Kailangan ay may kahit isang special symbol (hal. @, #, $, %, !).');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Hindi magkatugma ang bagong password at confirmation.');
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    const res = await resetPasswordWithPin(forgotEmail.trim(), forgotPin.trim(), forgotNewPassword);
    setForgotLoading(false);

    if (res.success) {
      setForgotMessage(res.message);
      // Auto-populate login form
      setEmail(forgotEmail.trim());
      setPassword(forgotNewPassword);
      setTimeout(() => {
        setIsForgotOpen(false);
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotMessage('');
      }, 2000);
    } else {
      setForgotError(res.error || 'Hindi mabago ang password. Pakisuri ang impormasyon.');
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

          {/* Login Mode Toggle: Quick PIN vs Password */}
          <div className="flex rounded-2xl bg-white/10 p-1 mb-4 border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => { setLoginMode('pin'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'pin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>4-Digit PIN Login</span>
              <span className="text-[10px] bg-slate-950/25 px-1.5 py-0.5 rounded-full font-mono">0000</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'password'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Password</span>
            </button>
          </div>

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

            {loginMode === 'pin' ? (
              /* Quick 4-Digit PIN Input */
              <div>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="4-Digit PIN (Default: 0000)"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3.5 pl-10 pr-3.5 text-center font-mono text-xl font-black tracking-widest text-emerald-300 placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1.5 px-1">
                  <span>Default PIN: <strong>0000</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotError('');
                      setForgotMessage('');
                      setIsForgotOpen(true);
                    }}
                    className="text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                  >
                    Change PIN / Forgot?
                  </button>
                </div>
              </div>
            ) : (
              /* Password Input */
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
                <div className="flex items-center justify-end -mt-1 pt-2">
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
              </div>
            )}

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
                  <span>{loginMode === 'pin' ? 'Log In with PIN' : 'Sign In with Password'}</span>
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

      {/* Forgot Password Glass Modal with Direct In-App OTP Verification */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900/95 border border-white/20 p-7 shadow-2xl text-white animate-modal-pop">
            <button
              onClick={() => {
                setIsForgotOpen(false);
                setForgotStep(1);
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Reset Password via PIN
                </h3>
                <p className="text-xs text-slate-300">
                  Instant reset sa mobile at desktop nang walang email links
                </p>
              </div>
            </div>

            {forgotMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-3.5 text-xs text-emerald-200 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="font-semibold">{forgotMessage}</span>
              </div>
            )}

            {forgotError && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs text-rose-200 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span className="font-semibold">{forgotError}</span>
              </div>
            )}

            <form onSubmit={handleForgotWithPin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    4-Digit Security PIN
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Default: 0000
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-emerald-400/70" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    placeholder="0000"
                    value={forgotPin}
                    onChange={(e) => setForgotPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-2 pl-10 pr-3.5 text-center font-mono text-lg font-black tracking-widest text-emerald-300 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Naka-set sa <strong>0000</strong> ang default PIN ng lahat ng existing accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password (Min. 8 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-emerald-400/70" />
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-2 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="absolute right-3 top-2 p-1 text-slate-400 hover:text-emerald-300 rounded-lg transition"
                  >
                    {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-emerald-400/70" />
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-2 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {forgotLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
