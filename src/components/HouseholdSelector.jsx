import React, { useState, useRef, useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { Home, ChevronDown, Plus, KeyRound, Check, Copy } from 'lucide-react';

export const HouseholdSelector = ({ onOpenCreateModal, onOpenJoinModal }) => {
  const { households, currentHousehold, switchHousehold } = useHousehold();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentHousehold) {
    return (
      <button
        onClick={onOpenCreateModal}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Create Household
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-xl bg-slate-100/90 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-200/80 transition border border-slate-200/60 max-w-[210px] sm:max-w-[260px]"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
          <Home className="h-4 w-4" />
        </div>
        <div className="truncate">
          <p className="truncate text-xs font-bold leading-tight text-slate-900">
            {currentHousehold.name}
          </p>
          <p className="truncate text-[10px] text-slate-500 font-medium">
            Code: {currentHousehold.invite_code}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Households
            </span>
            <button
              onClick={(e) => handleCopyCode(e, currentHousehold.invite_code)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
              title="Copy current invite code"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="py-1 max-h-56 overflow-y-auto">
            {households.map((hh) => {
              const isActive = hh.id === currentHousehold.id;
              return (
                <button
                  key={hh.id}
                  onClick={() => {
                    switchHousehold(hh.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isActive ? 'bg-emerald-50 font-bold text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate font-semibold">{hh.name}</p>
                    <p className="text-[10px] text-slate-400 font-normal">Code: {hh.invite_code}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreateModal();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Plus className="h-4 w-4 text-emerald-600" />
              Create Another Household
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenJoinModal();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Join Household with Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
