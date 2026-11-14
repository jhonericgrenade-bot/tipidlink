import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Sparkles, KeyRound, ArrowLeft } from 'lucide-react';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  useEffect(() => {
    // Check if the URL hash contains Supabase error parameters (e.g. otp_expired)
    const hash = window.location.hash || '';
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const desc = params.get('error_description') || '';
      if (desc.toLowerCase().includes('expired') || desc.toLowerCase().includes('invalid')) {
        setError('Ang password reset link ay paso na (expired) o nagamit na. Pakisubukan muling mag-request ng bagong reset link sa login page.');
      } else {
        setError(desc.replace(/\+/g, ' ') || 'Invalid or expired password reset link.');
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasUppercase) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!hasLowercase) {
      setError('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: password,
        });
        if (updateErr) throw updateErr;
      } else {
        await updatePassword(password);
      }

      setSuccess('Matagumpay na nabago ang iyong password! Ililipat ka na sa Login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password. The reset session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden"
      style={{ backgroundImage: `url('/family_hero_bg.png')` }}
    >
      {/* Deep Atmospheric Glass Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-emerald-950/60 to-slate-900/80 backdrop-blur-[4px]" />

      {/* Glowing Neon Spheres */}
      <div className="absolute -top-20 -left-20 w-88 h-88 rounded-full bg-emerald-500/30 blur-3xl animate-pulse-subtle pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-teal-400/25 blur-3xl animate-float pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] my-auto animate-modal-pop">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl p-7 sm:p-9 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)] border border-white/20 ring-1 ring-white/10 text-white">
          
          {/* Top Specular Edge Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />

          {/* Brand Header */}
          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide shadow-xs mb-3 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>TipidLink Security</span>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-2 shadow-lg shadow-emerald-500/20">
              <KeyRound className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white">
              Create New Password
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 font-medium">
              Enter and confirm your new account password below.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-emerald-500/20 backdrop-blur-md p-3.5 text-xs text-emerald-200 border border-emerald-400/40 shadow-xs animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 space-y-2 rounded-2xl bg-rose-500/20 backdrop-blur-md p-3.5 text-xs text-rose-200 border border-rose-500/40 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span className="font-semibold">{error}</span>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:text-white underline mt-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Bumalik sa Login para mag-request ng bagong link
              </Link>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="New Password (Min. 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-emerald-300 rounded-lg transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength checklist */}
              {password && (
                <div className="mt-2.5 rounded-xl bg-white/5 border border-white/10 p-2.5 text-[11px] grid grid-cols-2 gap-1 text-slate-300">
                  <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                    <span>{hasMinLength ? '✓' : '○'} 8+ chars</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                    <span>{hasUppercase ? '✓' : '○'} Uppercase</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasLowercase ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                    <span>{hasLowercase ? '✓' : '○'} Lowercase</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                    <span>{hasSpecial ? '✓' : '○'} Symbol (!@#)</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400/70 group-focus-within:text-emerald-300 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/20 shadow-inner transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-5 text-center text-xs text-slate-300">
            <Link to="/login" className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              Bumalik sa Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
