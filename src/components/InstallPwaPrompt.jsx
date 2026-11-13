import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

export const InstallPwaPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone installed app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Capture standard PWA install event for Android, Chrome, Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('tipidlink_install_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fired when installation completes
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect iOS Safari (which uses manual "Add to Home Screen")
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|android/.test(userAgent);
    if (isIos && isSafari && !isStandalone) {
      setIsIosSafari(true);
      if (!sessionStorage.getItem('tipidlink_install_dismissed')) {
        setIsVisible(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIosSafari) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // In case beforeinstallprompt hasn't fired yet or browser doesn't support automatic prompt
      alert('Para i-install ang TipidLink:\n1. Pindutin ang 3 dots (⋮) sa browser menu.\n2. Piliin ang "Install app" o "Add to Home screen".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    sessionStorage.setItem('tipidlink_install_dismissed', 'true');
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-modal-pop">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white shadow-2xl border border-emerald-500/30">
        {/* Ambient subtle glow */}
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-950/40">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="flex-1 pr-6">
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/20 mb-1">
              <Sparkles className="h-2.5 w-2.5" />
              <span>Installable App</span>
            </div>
            <h4 className="text-sm font-black text-white">I-install ang TipidLink App!</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Direktang i-download at i-install sa phone o laptop mo para may sariling app icon at mabilis buksan.
            </p>

            {/* iOS Guide instructions if requested */}
            {showIosGuide && (
              <div className="mt-2.5 rounded-xl bg-white/10 p-2.5 text-[11px] text-emerald-100 border border-white/10 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-emerald-300" /> Step 1: Pindutin ang <span className="underline">Share button</span> (icon sa ibaba ng Safari).
                </p>
                <p className="font-bold flex items-center gap-1">
                  <PlusSquare className="h-3 w-3 text-emerald-300" /> Step 2: I-tap ang <span className="underline">"Add to Home Screen"</span>.
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-400 active-press hover-lift transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {isIosSafari ? 'Paano I-install?' : 'Install App Ngayon'}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Mamaya na
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

