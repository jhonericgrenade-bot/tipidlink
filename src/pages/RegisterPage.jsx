import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';

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
  // - Uppercase (A-Z)
  // - Lowercase (a-z)
  // - Special symbols
  // - Numbers allowed / encouraged
  // - Minimum length 8 characters
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
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center px-4 py-8 relative"
      style={{ backgroundImage: `url('/family_hero_bg.png')` }}
    >
      {/* Soft warm backdrop */}
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" />

      {/* Clean, De-cluttered Card */}
      <div className="relative z-10 w-full max-w-[400px] my-auto animate-modal-pop">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/60">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/tipidlink-logo.png"
              alt="TipidLink"
              className="h-16 w-auto object-contain mb-2 hover:scale-105 transition-transform duration-300 animate-float"
            />
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Create Account
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Start managing your household budget together
            </p>
          </div>

          {/* Feedback Notices */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Password (e.g. Tipid@2026)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Real-time Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="mt-2 rounded-2xl bg-slate-50/90 p-3 border border-slate-200/80 space-y-2 animate-fadeIn">
                  <p className="text-[11px] font-bold text-slate-700">Pamantayan sa Password:</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {hasMinLength ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      <span>8+ characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {hasUppercase ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      <span>Uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {hasLowercase ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      <span>Lowercase (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-medium transition-colors ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {hasSpecial ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      <span>Symbol (!@#$...)</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Numero (0-9):</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${hasNumber ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {hasNumber ? '✓ May kasamang Numero' : 'Allowed / Pwede'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Simple Link */}
          <div className="mt-5 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
