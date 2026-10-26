import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Sparkles, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';

export const LoginPage = () => {
  const { signIn, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email and password.');
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

  const handleDemoLogin = (personaKey) => {
    loginAsDemo(personaKey);
    navigate('/');
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
              Sama-samang pagtitipid para sa pamilyang Pilipino
            </p>
          </div>

          {/* Segmented Tab Bar (Sign In / Register) */}
          <div className="grid grid-cols-2 p-1 mb-4 rounded-2xl bg-slate-100/90 border border-slate-200/70 text-xs font-bold">
            <button
              type="button"
              className="py-2 rounded-xl bg-white text-emerald-800 shadow-xs border border-slate-200/50 flex items-center justify-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sign In</span>
            </button>
            <Link
              to="/register"
              className="py-2 rounded-xl text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition text-center"
            >
              <span>Mag-Register</span>
            </Link>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-3.5 flex items-start gap-2.5 rounded-2xl bg-rose-50/95 p-3 text-xs text-rose-700 border border-rose-200 shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
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
                  placeholder="Halimbawa: juan@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Kahit anong email (Gmail, Yahoo, iCloud, atbp.)</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Ilagay ang iyong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  title={showPassword ? 'Itago ang password' : 'Ipakita ang password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                  <span>Pumapasok...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Household</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Evaluator Access (Sleek Presentation Card) */}
          <div className="mt-4 border-t border-slate-200/60 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Evaluator Demo Access
              </span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                1-Click Test
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('maria')}
                className="group flex items-center gap-2 p-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/90 active:scale-95 transition text-left cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  M
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                    Maria Santos
                  </p>
                  <p className="text-[9px] text-emerald-700 font-semibold truncate">
                    Budget Manager
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('juan')}
                className="group flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 active:scale-95 transition text-left cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  J
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-slate-900 group-hover:text-slate-950 truncate">
                    Juan Santos
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold truncate">
                    Breadwinner
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Presentation Tagline */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold italic text-emerald-800">
              &ldquo;Habang nagtitipid, gumiginhawa ang buhay.&rdquo;
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              As you save, life becomes more comfortable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
