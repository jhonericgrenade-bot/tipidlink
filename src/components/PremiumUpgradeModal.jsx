import React, { useState } from 'react';
import { Modal } from './Modal';
import { usePremium } from '../contexts/PremiumContext';
import {
  Crown,
  CheckCircle2,
  Sparkles,
  Building2,
  Users,
  FileSpreadsheet,
  Zap,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export const PremiumUpgradeModal = ({ isOpen, onClose }) => {
  const {
    isPremium,
    premiumPlan,
    sponsorDetails,
    activatePremium,
    activateSponsoredAccess,
    resetToFree,
  } = usePremium();

  const [activeTab, setActiveTab] = useState('pay'); // 'pay' or 'sponsor'
  const [selectedMethod, setSelectedMethod] = useState('gcash'); // 'gcash' or 'maya'
  const [phoneNumber, setPhoneNumber] = useState('0917 123 4567');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Sponsored access states
  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsorError, setSponsorError] = useState('');

  // Valid promo / community partner codes for the presentation
  const VALID_SPONSOR_CODES = {
    'BARANGAY2026': 'Barangay LGU Financial Literacy Initiative',
    'COOPLINK': 'National Cooperative Development Partner',
    'DEPEDIPON': 'School & PTA Financial Literacy Program',
    'COMMUNITY30': 'NGO Grassroots Household Development',
    'TIPIDPROMO': 'Sponsored Community Access Pilot',
  };

  const handleSimulatePayment = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      activatePremium(`TipidLink Premium Plan (₱30/mo - ${selectedMethod.toUpperCase()})`);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        onClose();
      }, 1400);
    }, 1000);
  };

  const handleApplySponsorCode = (e) => {
    e.preventDefault();
    setSponsorError('');
    const cleanCode = sponsorCode.trim().toUpperCase();

    if (!cleanCode) {
      setSponsorError('Please enter a sponsor code.');
      return;
    }

    if (VALID_SPONSOR_CODES[cleanCode]) {
      const partner = VALID_SPONSOR_CODES[cleanCode];
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        activateSponsoredAccess(partner);
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
          onClose();
        }, 1400);
      }, 700);
    } else {
      setSponsorError('Invalid code. Sample demo codes: BARANGAY2026, COOPLINK, DEPEDIPON, COMMUNITY30');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TipidLink Business Model & Premium Access" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Banner from PPT */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 p-5 text-white shadow-md">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold text-amber-200 border border-amber-300/30 mb-2">
                <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                <span>Affordable & Community-Based Plan</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">
                PHP 30 Premium Plan
              </h3>
              <p className="mt-1 text-xs text-emerald-100/90 leading-relaxed max-w-md">
                &ldquo;One household. One shared budget. Better money habits.&rdquo;
                <br />
                Directly aligned with TipidLink&apos;s Business Model for Filipino families and sponsored communities.
              </p>
            </div>

            <div className="hidden sm:flex flex-col items-end text-right shrink-0 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
              <span className="text-[10px] uppercase font-bold text-emerald-200">Affordable Rate</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-white">₱30</span>
                <span className="text-xs text-emerald-200">/ month</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-medium">Barya lang kada buwan</span>
            </div>
          </div>
        </div>

        {/* Current Status Indicator */}
        {isPremium && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-950">Active Premium Subscription</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Plan: <span className="font-semibold">{premiumPlan}</span>
                  {sponsorDetails && ` • Sponsored by ${sponsorDetails}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetToFree();
                alert('Plan reset to Free Household Tier for demo purposes.');
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
            >
              Reset to Free
            </button>
          </div>
        )}

        {/* Plan Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Free Tier */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Free Household Tier</h4>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                Default
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Essential financial collaboration tools for basic family needs.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Single household shared budget</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Up to 3 family members</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Standard bill & expense tracking</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="h-3.5 w-3.5 flex items-center justify-center font-bold text-xs">—</span>
                <span>Basic transaction history</span>
              </li>
            </ul>
          </div>

          {/* Premium Tier */}
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/20 p-4 space-y-3 relative shadow-xs">
            <div className="absolute -top-2.5 right-4 bg-emerald-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow-xs">
              Recommended in PPT
            </div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                Premium Plan
              </h4>
              <span className="text-xs font-black text-emerald-700">₱30 / month</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Complete community & extended family financial empowerment.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-700">
              <li className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Unlimited family members & kamag-anak</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Full CSV & Financial Statement Export</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Overdue bill alerts & partial payment ledger</span>
              </li>
              <li className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Multi-goal Pondong Pang-ipit milestone tracker</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tabs: Direct Payment vs Sponsored Access */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              onClick={() => setActiveTab('pay')}
              className={`flex-1 py-3 px-4 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'pay'
                  ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Direct ₱30 Subscription (GCash / Maya)
            </button>
            <button
              onClick={() => setActiveTab('sponsor')}
              className={`flex-1 py-3 px-4 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'sponsor'
                  ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Sponsored Community Access
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {activeTab === 'pay' ? (
              <form onSubmit={handleSimulatePayment} className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Choose E-Wallet:</span>
                  <span className="text-[11px] text-slate-400">Interactive Demo Simulation</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('gcash')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer text-left ${
                      selectedMethod === 'gcash'
                        ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                      G
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">GCash</p>
                      <p className="text-[10px] text-slate-500">Pay ₱30.00</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('maya')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer text-left ${
                      selectedMethod === 'maya'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                      M
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Maya</p>
                      <p className="text-[10px] text-slate-500">Pay ₱30.00</p>
                    </div>
                  </button>
                </div>

                {/* Simulated E-wallet Screen */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account / Mobile Number:</span>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      className="text-right font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Total Subscription Amount:</span>
                    <span className="font-black text-sm text-emerald-800">₱30.00</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
                    <span>Billing Cycle:</span>
                    <span>Monthly (Cancel anytime)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-900/10 hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Processing Demo Payment...</span>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Simulate Pay ₱30 via {selectedMethod.toUpperCase()} (Instant Pro)</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Sponsored Access Form */
              <form onSubmit={handleApplySponsorCode} className="space-y-4 text-xs">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Building2 className="h-4 w-4 text-amber-600" />
                    Sponsored Community Access Program
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Under TipidLink&apos;s Business Model, underserved households gain 100% free premium access through partnerships with <strong>Cooperatives, Schools, Barangays, LGUs, and NGOs</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Enter Community / Institutional Partner Voucher Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sponsorCode}
                      onChange={(e) => {
                        setSponsorCode(e.target.value);
                        setSponsorError('');
                      }}
                      placeholder="e.g. BARANGAY2026, COOPLINK, DEPEDIPON"
                      className="flex-1 uppercase font-mono tracking-wider rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? 'Verifying...' : 'Activate'}
                    </button>
                  </div>
                  {sponsorError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1.5">{sponsorError}</p>
                  )}
                </div>

                {/* Demo quick clickable chips */}
                <div className="pt-1">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                    Click to try sample demo sponsor codes:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(VALID_SPONSOR_CODES).map(([code, org]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setSponsorCode(code);
                          setSponsorError('');
                        }}
                        className="rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-600 transition cursor-pointer"
                        title={org}
                      >
                        {code} ({org.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="rounded-xl bg-emerald-600 p-3 text-center text-xs font-bold text-white shadow-lg animate-in fade-in zoom-in-95">
            🎉 TipidLink Premium successfully activated!
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="text-[11px] flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            100% Aligned with Presentation Slide 06
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
