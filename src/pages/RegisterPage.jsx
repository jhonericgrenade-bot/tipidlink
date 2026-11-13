import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Circle, Eye, EyeOff, Sparkles } from 'lucide-react';

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

  // Password requirement tests based on teacher's specifications:
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Pakilagay ang lahat ng kinakailangang impormasyon.');
      return;
    }
    if (!hasMinLength) {
      setError('Kailangang hindi bababa sa 8 characters ang iyong password.');
      return;
    }
    if (!hasUppercase) {
      setError('Dapat may kahit isang UPPERCASE letter (A-Z) ang password.');
      return;
    }
    if (!hasLowercase) {
      setError('Dapat may kahit isang lowercase letter (a-z) ang password.');
      return;
    }
    if (!hasSpecial) {
      setError('Dapat may kahit isang special symbol (hal. @, #, $, %, !, &) ang password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Hindi magkatugma ang password at confirm password.');
      return;
    }

    setError('');
    setLoading(true);

    const res = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Matagumpay na nagawa ang account! Paglilipat sa dashboard...');
      setTimeout(() => navigate('/'), 1200);
    } else {
      setError(res.error || 'Hindi matagumpay ang pag-register. Pakisubukan muli.');
    }
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

      {/* Main Ultra Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] my-auto animate-modal-pop">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900/55 backdrop-blur-3xl p-7 sm:p-9 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] border border-white/20 ring-1 ring-white/10 text-white">
          
          {/* Top Specular Edge Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />
          
          {/* Subtle Inner Glass Glow */}
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide shadow-xs mb-3 backdrop-blur-md animate-bounce-subtle">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Simulan ang Pag-asenso</span>
            </div>

            <img
              src="/tipidlink-logo.png"
              alt="TipidLink"
              className="h-16 w-auto object-contain mb-2 filter drop-shadow-[0_10px_20px_rgba(16,185,129,0.35)] hover:scale-105 transition-transform duration-300 animate-float"
            />
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Create Account</span>
              <span>📝✨</span>
            </h1>
            <p className="text-xs text-emerald-100/75 mt-1 font-medium">
              Sumali sa TipidLink at pamahalaan ang pampamilyang badyet
            </p>
          </div>

          {/* Feedback Notices */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-rose-500/20 backdrop-blur-md p-3 text-xs text-rose-200 border border-rose-500/40 shadow-xs animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-emerald-500/20 backdrop-blur-md p-3 text-xs text-emerald-200 border border-emerald-400/40 shadow-xs animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="relative group">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Buong pangalan (Full name)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
              </div>
            </div>

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
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Password (hal. Tipid@2026)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-emerald-300 rounded-lg transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Real-time Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="mt-2 rounded-2xl bg-white/10 backdrop-blur-xl p-3 border border-white/15 space-y-2 animate-fade-in shadow-inner">
                  <p className="text-[11px] font-bold text-emerald-200">Pamantayan sa Password:</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasMinLength ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                      {hasMinLength ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <span>8+ characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasUppercase ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                      {hasUppercase ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <span>Uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasLowercase ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                      {hasLowercase ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <span>Lowercase (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasSpecial ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                      {hasSpecial ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <span>Symbol (!@#$...)</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className="text-slate-300">Numero (0-9):</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${hasNumber ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-slate-400'}`}>
                      {hasNumber ? '✓ May kasamang Numero' : 'Allowed / Pwede'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Kumpirmahin ang password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Gumawa ng Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-5 text-center text-xs text-slate-300">
            May account ka na?{' '}
            <Link to="/login" className="font-extrabold text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              Mag-sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
