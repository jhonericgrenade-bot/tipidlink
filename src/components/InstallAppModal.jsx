import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Apple,
  Monitor,
  Share2,
  PlusSquare,
  Download,
  X,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const InstallAppModal = ({ isOpen, onClose, deferredPrompt }) => {
  const [activeTab, setActiveTab] = useState('android');
  const [copied, setCopied] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const inApp = /fban|fbav|instagram|line|viber|tiktok|messenger/.test(ua);

    setIsIosDevice(isIos);
    setIsAndroidDevice(isAndroid);
    setIsInAppBrowser(inApp);

    if (isIos) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      const url = window.location.origin;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTriggerNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onClose();
      }
    } else {
      alert('To install TipidLink:\n1. Tap the 3 dots (⋮) in your browser menu.\n2. Tap "Install app" or "Add to Home screen".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-white">
                <Smartphone className="h-6 w-6 text-emerald-200" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200 border border-emerald-400/20 mb-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Free Mobile App</span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  Install TipidLink on Your Phone
                </h3>
                <p className="text-xs text-emerald-100">
                  Runs directly on Android & iOS with zero storage bloat
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* In-App Browser Warning Alert */}
          {isInAppBrowser && (
            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-amber-500/25 p-3 text-xs text-amber-100 border border-amber-300/30">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" />
              <div>
                <p className="font-bold text-white">Messenger / Facebook Browser Detected</p>
                <p className="mt-0.5 text-[11px] text-amber-100 leading-snug">
                  In-app browsers block app downloads. Tap the <strong>three dots (⋮)</strong> or <strong>Share icon</strong> at the top right, then select <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-2 gap-1.5">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Smartphone className="h-4 w-4 text-emerald-600" />
            <span>Android</span>
            {isAndroidDevice && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Apple className="h-4 w-4 text-slate-800" />
            <span>iPhone / iPad</span>
            {isIosDevice && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Monitor className="h-4 w-4 text-slate-600" />
            <span>PC / Mac</span>
          </button>
        </div>

        {/* Body Guide */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* ANDROID TAB */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              {deferredPrompt && (
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-center">
                  <p className="text-xs font-bold text-emerald-900 mb-2">
                    Your Android Chrome browser is ready for automatic 1-tap install!
                  </p>
                  <button
                    onClick={handleTriggerNativeInstall}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-500 active:scale-[0.98] transition cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install TipidLink Now (1-Tap)</span>
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Open in Google Chrome</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      If you opened the link from Messenger or Facebook, tap the <strong>3 dots (⋮)</strong> at the top right and select <strong>"Open in Chrome"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Open Chrome Menu</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      In Chrome, tap the <strong>three vertical dots (⋮)</strong> in the top-right corner next to the address bar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Select "Install app" or "Add to Home screen"</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong> on Samsung Internet).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/60">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-xs">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Confirm "Install"</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      The TipidLink icon will appear on your home screen and app drawer just like an app installed from Google Play!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IOS TAB */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200 leading-snug">
                <span className="font-bold">Apple iOS Notice:</span> Apple requires using the native <strong>Safari</strong> browser to add apps to your home screen.
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-black text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Open in Safari</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Make sure you are browsing in <strong>Apple Safari</strong> (not Chrome or inside Messenger). If inside Messenger, tap `...` and tap <strong>"Open in Safari"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-black text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Tap the Share Button</span>
                      <Share2 className="h-3.5 w-3.5 text-blue-600" />
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tap the <strong>Share icon</strong> (the square with an arrow pointing upward) located at the bottom center of your Safari screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-black text-xs">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Select "Add to Home Screen"</span>
                      <PlusSquare className="h-3.5 w-3.5 text-slate-700" />
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Scroll down the options list and tap <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/60">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-xs">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Tap "Add" in Top Right</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Tap <strong>"Add"</strong> at the top right. TipidLink is now saved on your iPhone home screen and opens fullscreen with zero browser address bars!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DESKTOP TAB */}
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Look at the Address Bar</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    In Google Chrome or Microsoft Edge on PC/Mac, look at the right side of the URL bar (near the bookmark star).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Click the "Install" Icon</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Click the small monitor/down-arrow icon that says <strong>"Install TipidLink"</strong>, or click Chrome Menu (⋮) &gt; <strong>"Save and share"</strong> &gt; <strong>"Install TipidLink"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shareable Link Box */}
          <div className="rounded-2xl bg-slate-100/80 p-3.5 border border-slate-200">
            <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Send Link to Teammate / Phone:</span>
              <span className="text-[10px] text-slate-500 font-normal">Copy and open in Chrome/Safari</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.origin : 'https://tipidlink.vercel.app'}
                className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-mono text-slate-700 border border-slate-200 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition cursor-pointer"
          >
            Naintindihan Ko (Got it)
          </button>
        </div>
      </div>
    </div>
  );
};
