import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export const RegisterPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      setError('Password must be at least 6 characters.');
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
      setSuccessMsg('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1200);
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center p-4 sm:p-6 relative"
      style={{ backgroundImage: `url('/family_hero_bg.png')` }}
    >
      {/* Light, subtle backdrop veil */}
      <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px]" />

      {/* Floating Centered Frosted Glass Card */}
      <div className="relative z-10 w-full max-w-md my-auto">
        {/* Top Floating Badge */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5da26b] px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/20">
            <Sparkles className="h-3.5 w-3.5 text-emerald-100" />
            <span>A shared family budget management platform</span>
          </div>
        </div>

        {/* Semi-transparent Glassmorphism Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/60">
          {/* Official TipidLink Logo */}
          <div className="flex flex-col items-center text-center mb-5">
            <img
              src="/tipidlink-logo.png"
              alt="TipidLink"
              className="h-20 w-auto object-contain drop-shadow-xs mb-1 hover:scale-105 transition-transform"
            />
            <p className="text-xs text-slate-500 font-medium">
              Create an account for your household
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50/90 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50/90 p-3 text-xs text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#059669] py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/25 hover:bg-[#047857] transition disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Bottom Presentation Tagline */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-xs font-bold italic text-emerald-800">
              &ldquo;As you save, life becomes more comfortable.&rdquo;
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Habang nagtitipid, gumiginhawa ang buhay.
            </p>
          </div>

          <div className="mt-3 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-700 hover:text-emerald-800 underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
