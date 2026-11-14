import React, { useState, useEffect } from 'react';
import { useHousehold, encodeHouseholdCode } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatPHP } from '../lib/formatters';
import {
  Home,
  Copy,
  Check,
  KeyRound,
  Trash2,
  Edit,
  Sparkles,
  Info,
  Crown,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Users,
  AlertTriangle,
} from 'lucide-react';

export const HouseholdPage = ({ onOpenCreate, onOpenJoin }) => {
  const {
    currentHousehold,
    households,
    members,
    isOwnerOrAdmin,
    currentUserRole,
    updateHousehold,
    updateMemberRole,
    removeMember,
    deleteHousehold,
    leaveHousehold,
    loading,
  } = useHousehold();
  const { user, isDemoMode } = useAuth();
  const { isPremium, openUpgradeModal } = usePremium();

  const [copied, setCopied] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBudget, setEditBudget] = useState('0');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (currentHousehold) {
      setEditName(currentHousehold.name || '');
      setEditDesc(currentHousehold.description || '');
      setEditBudget(String(currentHousehold.monthly_budget_target || 0));
    }
  }, [currentHousehold]);

  const displayCode = isDemoMode
    ? 'SANTOS2026'
    : (currentHousehold?.invite_code || 'TIPID-2026');

  const handleCopyCode = async () => {
    if (!isPremium) {
      openUpgradeModal();
      return;
    }

    if (!displayCode) return;

    let success = false;
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(displayCode);
        success = true;
      } catch (err) {
        console.warn('Navigator clipboard error, trying fallback:', err);
      }
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = displayCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.error('Fallback clipboard error:', e);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    await updateHousehold({
      name: editName.trim(),
      description: editDesc.trim(),
      monthly_budget_target: Number(editBudget),
    });
    setFormLoading(false);
    setIsEditProfileOpen(false);
  };

  const handleRoleChange = async (memberId, targetName, newRole) => {
    let confirmMsg = '';
    if (newRole === 'owner') {
      confirmMsg = `BABALA SA PAGLILIPAT NG OWNER ROLE:\n\nSigurado ka bang nais mong italaga si "${targetName}" bilang bagong OWNER?\n\nPAALALA SA PAHINTULOT:\n• Tanging ang kasalukuyang Owner lamang ang makakagawa nito.\n• Ang Owner ang may buong kapangyarihan sa pagbura ng household at pag-demote ng Admins.\n\nNais mo bang magpatuloy?`;
    } else if (newRole === 'admin') {
      confirmMsg = `PABATID SA PAGTATALAGA NG ADMIN:\n\nItatalaga mo si "${targetName}" bilang ADMIN.\n\nPAALALA SA PAHINTULOT:\n• Magkakaroon siya ng karapatang magpalit ng Monthly Budget Target.\n• Maaari siyang mag-alis ng ordinaryong Members.\n• Hindi niya maaaring tanggalin o palitan ang Owner.\n\nNais mo bang magpatuloy?`;
    } else if (newRole === 'member') {
      confirmMsg = `PABATID: Pagbabalik sa Ordinaryong MEMBER\n\nIbababa mo ang tungkulin ni "${targetName}" bilang ordinaryong MEMBER.\n\nPAALALA SA PAHINTULOT:\n• Hindi na siya makakapagbago ng budget target o mag-alis ng ibang miyembro.\n• Makakapag-record pa rin siya ng araw-araw na gastos, kita, at bills.\n\nNais mo bang magpatuloy?`;
    }

    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }

    const res = await updateMemberRole(memberId, newRole);
    if (res && !res.success) {
      alert(`Hindi ma-update ang role: ${res.error}`);
    }
  };

  const handleRemoveMember = async (memberId, targetName, targetRole) => {
    const confirmMsg = `BABALA SA PAG-ALIS NG MIYEMBRO:\n\nSigurado ka bang nais mong tanggalin si "${targetName}" (${targetRole.toUpperCase()}) sa household?\n\nPAALALA SA PAHINTULOT:\n• Tanging Owner at Admin lamang ang may karapatang magtanggal ng kapamilya.\n• Hindi na makikita ng taong ito ang inyong shared financial records at mga bills.\n\nNais mo bang tanggalin ang miyembrong ito?`;

    if (window.confirm(confirmMsg)) {
      const res = await removeMember(memberId);
      if (res && !res.success) {
        alert(`Hindi maalis ang miyembro: ${res.error}`);
      }
    }
  };

  if (loading && !currentHousehold) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-page-enter">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-slate-500">Inihahanda ang impormasyon ng iyong household...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Household & Family Members
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage who can view and log income, expenses, and bills in this shared budget.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenJoin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active-press hover-lift transition cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-indigo-600" />
            Join with Code
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press hover-lift transition cursor-pointer"
          >
            <Home className="h-4 w-4" />
            New Household
          </button>
        </div>
      </div>

      {/* Household Profile & Invite Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Household Profile Card */}
        <div className="md:col-span-2 rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 hover-lift-subtle card-interactive">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{currentHousehold?.name}</h3>
                <p className="text-xs text-slate-500">
                  {currentHousehold?.description || 'Shared family home'}
                </p>
              </div>
            </div>

            {isOwnerOrAdmin ? (
              <button
                onClick={() => {
                  setEditName(currentHousehold.name);
                  setEditDesc(currentHousehold.description || '');
                  setEditBudget(String(currentHousehold.monthly_budget_target || 65000));
                  setIsEditProfileOpen(true);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 active-press transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Edit Household Info"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Settings</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 font-medium"
                title="Tanging ang Owner at Admin lamang ang may karapatang magbago ng settings"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Pang-Owner/Admin lamang</span>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs">
            <div>
              <span className="text-slate-400">Monthly Budget Target</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {formatPHP(currentHousehold?.monthly_budget_target)}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Currency</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {currentHousehold?.currency || 'PHP'} (₱)
              </p>
            </div>
            <div>
              <span className="text-slate-400">Active Members</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>
        </div>

        {/* Family Invite Code Box */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white shadow-md flex flex-col justify-between hover-lift-subtle card-interactive">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Household Invite Code
                </span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                isPremium ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-emerald-100 border border-white/20'
              }`}>
                <Crown className="h-3 w-3 fill-current" />
                {isPremium ? 'Pro Active' : '₱30 Pro Feature'}
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Share this code with your parents, spouse, or working siblings so they can connect to this shared budget.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/20 gap-2">
              {isPremium ? (
                <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white truncate max-w-[240px]" title={displayCode}>
                  {displayCode || 'Generating code...'}
                </span>
              ) : (
                <div className="flex items-center gap-2 text-emerald-200">
                  <Lock className="h-4 w-4 text-amber-300 shrink-0" />
                  <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-amber-200">
                    LOCKED (₱30 PRO ONLY)
                  </span>
                </div>
              )}

              <button
                onClick={handleCopyCode}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer active-press hover-lift shrink-0 ${
                  isPremium
                    ? 'bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400 shadow-md ring-2 ring-amber-300/50'
                }`}
                title={isPremium ? 'Copy Invite Code' : 'Mag-upgrade sa ₱30 Pro para ma-unlock at ma-copy ang code'}
              >
                {isPremium ? (
                  <>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </>
                ) : (
                  <>
                    <Crown className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
                    <span>Unlock (₱30 Pro)</span>
                  </>
                )}
              </button>
            </div>

            {!isPremium ? (
              <div
                onClick={openUpgradeModal}
                className="mt-3 flex items-center justify-between rounded-xl bg-amber-400/20 border border-amber-300/40 p-2.5 text-[11px] text-amber-200 cursor-pointer hover:bg-amber-400/30 active-press transition group"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  Kailangan ng ₱30 Pro para ma-copy at ma-share ang code
                </span>
                <span className="font-black underline text-white group-hover:translate-x-0.5 transition-transform">
                  Upgrade &rarr;
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-2.5 text-[11px] text-emerald-200">
                <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300 shrink-0" />
                <span>₱30 Premium Active • Pwedeng i-share ang code sa lahat ng kapamilya</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-200">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Secured with Supabase Row Level Security (RLS)</span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Family Members</h3>
            <p className="text-xs text-slate-500">
              Assigned roles define who can manage budgets, invite users, or record transactions.
            </p>
          </div>
        </div>

        {/* Role Permissions & Security Policy Warning Banner */}
        <div className="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-950 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-amber-900 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Gabay sa Roles &amp; Mga Karapatan (Role Access Control):</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
              Security Policy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] leading-relaxed">
            {/* 👑 Owner */}
            <div className={`rounded-xl p-3 border shadow-2xs transition ${
              currentUserRole === 'owner' ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-white/80 border-amber-200/60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-amber-900 flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  👑 Owner (Pinuno)
                </span>
                {currentUserRole === 'owner' && (
                  <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.2 rounded-full">Ito Ka</span>
                )}
              </div>
              <p className="text-slate-600">
                <strong>Buong Kapangyarihan:</strong> Tanging ang Owner lamang ang makakapagbura ng household, mag-promote/demote ng Admin, at mag-alis ng kahit sinong miyembro.
              </p>
            </div>

            {/* 🛡️ Admin */}
            <div className={`rounded-xl p-3 border shadow-2xs transition ${
              currentUserRole === 'admin' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/40' : 'bg-white/80 border-amber-200/60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  🛡️ Admin (Katuwang)
                </span>
                {currentUserRole === 'admin' && (
                  <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">Ito Ka</span>
                )}
              </div>
              <p className="text-slate-600">
                <strong>Pamamahala:</strong> Pwedeng magbago ng budget target at mag-alis ng <strong>Member lamang</strong>. <em>Babala: Hindi pwedeng tanggalin o palitan ang Owner.</em>
              </p>
            </div>

            {/* 👤 Member */}
            <div className={`rounded-xl p-3 border shadow-2xs transition ${
              currentUserRole === 'member' ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/40' : 'bg-white/80 border-amber-200/60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-slate-800 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  👤 Member (Kasapi)
                </span>
                {currentUserRole === 'member' && (
                  <span className="text-[9px] font-black bg-slate-600 text-white px-1.5 py-0.2 rounded-full">Ito Ka</span>
                )}
              </div>
              <p className="text-slate-600">
                <strong>Pang-araw-araw:</strong> Pwedeng mag-record ng gastos, kita, at bills. <em>Babala: Walang karapatang magbago ng role o magtanggal ng kapamilya.</em>
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member) => {
            const isSelf = member.user_id === user?.id;

            return (
              <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      member.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        member.full_name || member.email
                      )}`
                    }
                    alt={member.full_name}
                    className="h-10 w-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{member.full_name}</p>
                      {isSelf && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {member.nickname && <span className="text-slate-600">{member.nickname} • </span>}
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <StatusBadge status={member.role} type="role" />

                  {!isSelf && (currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role === 'member')) ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, member.full_name || member.email, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 py-1 px-2 text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                        title="Palitan ang role ng kapamilya (may babala bago ilapat)"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {currentUserRole === 'owner' && <option value="owner">Owner</option>}
                      </select>

                      <button
                        onClick={() => handleRemoveMember(member.id, member.full_name || member.email, member.role)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Tanggalin sa household (may babala)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : !isSelf ? (
                    <span className="text-[10px] text-slate-400 italic">
                      Walang access magpalit
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-Step Sharing Guide */}
      <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200/80 p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Paano Mag-share ng Account sa Pamilya (3 Simpleng Hakbang):
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
            <span className="font-black text-emerald-700 text-sm">1. I-share ang Code</span>
            <p className="mt-1 text-slate-500">I-copy ang <strong>Household Code</strong> ({displayCode}) at ibigay sa iyong kapamilya (asawa, anak, magulang).</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
            <span className="font-black text-indigo-700 text-sm">2. Mag-sign up Sila</span>
            <p className="mt-1 text-slate-500">Buksan nila ang TipidLink sa kanilang cellphone at gumawa ng sariling account gamit ang kanilang email.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
            <span className="font-black text-amber-700 text-sm">3. I-click ang Join</span>
            <p className="mt-1 text-slate-500">Sa menu sa itaas, i-click ang <strong>"Join Household with Code"</strong> at i-paste ang code. Sabay na kayong makakapag-record!</p>
          </div>
        </div>
      </div>

      {/* Household Management */}
      {currentHousehold && (
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Household Management</h4>
            <p className="text-xs text-slate-500">
              {currentUserRole === 'owner'
                ? 'Bilang may-ari, maaari mong burahin ang household na ito kung hindi na kailangan.'
                : 'Maaari kang umalis sa household na ito anumang oras.'}
            </p>
          </div>
          <div>
            {currentUserRole === 'owner' ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Sigurado ka bang nais mong burahin ang "${currentHousehold.name}"? Mabubura ang lahat ng pampamilyang transaksyon at badyet nito.`)) {
                    await deleteHousehold(currentHousehold.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete This Household
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Sigurado ka bang nais mong umalis sa "${currentHousehold.name}"?`)) {
                    await leaveHousehold(currentHousehold.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Leave Household
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Household Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Household Profile"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Household Name *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Monthly Budget Limit (₱) *
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              required
              value={editBudget}
              onChange={(e) => setEditBudget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows="2"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
