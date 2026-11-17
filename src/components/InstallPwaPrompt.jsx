import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, AlertTriangle } from 'lucide-react';
import { InstallAppModal } from './InstallAppModal';

export const InstallPwaPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already running as standalone installed app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    const inApp = /fban|fbav|instagram|line|viber|tiktok|messenger/.test(ua);
    setIsInAppBrowser(inApp);

    // Listen for global custom open event from Navbar, Settings, or Login
    const handleGlobalOpen = () => {
      setIsModalOpen(true);
    };
    window.addEventListener('tipidlink-open-install-modal', handleGlobalOpen);

    // Capture standard PWA install event for Android, Chrome, Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fired when installation completes
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setIsModalOpen(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // On mobile devices, automatically surface install prompt after a short delay
    if (isMobile && !sessionStorage.getItem('tipidlink_install_minimized')) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('tipidlink-open-install-modal', handleGlobalOpen);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('tipidlink-open-install-modal', handleGlobalOpen);
    };
  }, []);

  const handleOpenModal = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') {
          setIsVisible(false);
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      setIsModalOpen(true);
    }
  };

  const handleMinimize = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsMinimized(true);
    sessionStorage.setItem('tipidlink_install_minimized', 'true');
  };

  if (isInstalled) {
    return (
      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    );
  }

  return (
    <>
      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* Floating Minimized Pill when banner was closed */}
      {isMinimized && !isVisible && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-bold shadow-xl border border-emerald-500/40 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer animate-fade-in"
          title="Install TipidLink to your home screen"
        >
          <Smartphone className="h-4 w-4 text-emerald-400" />
          <span>Install App</span>
        </button>
      )}

      {/* Full Floating Install Banner */}
      {isVisible && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-modal-pop">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-4 text-white shadow-2xl border border-emerald-500/40">
            {/* Ambient subtle glow */}
            <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-950/40">
                <Smartphone className="h-5 w-5" />
              </div>

              <div className="flex-1 pr-6">
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/20 mb-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Installable App (Android & iOS)</span>
                </div>
                <h4 className="text-sm font-black text-white">I-install ang TipidLink App!</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                  Direktang i-download at i-save sa home screen ng phone mo para may sariling app icon at mabilis buksan.
                </p>

                {isInAppBrowser && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-400/30">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>Nasa Messenger/FB ka: Buksan sa Chrome o Safari</span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-400 active:scale-95 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Install App Ngayon</span>
                  </button>
                  <button
                    onClick={handleMinimize}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Mamaya na
                  </button>
                </div>
              </div>

              <button
                onClick={handleMinimize}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                aria-label="Minimize"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
