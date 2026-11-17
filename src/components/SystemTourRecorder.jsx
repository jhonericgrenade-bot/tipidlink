import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Video,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Users,
  Smartphone,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

export const SystemTourRecorder = () => {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoTourActive, setIsAutoTourActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNarration, setVoiceNarration] = useState(true);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const autoTourTimeoutRef = useRef(null);

  const TOUR_STEPS = [
    {
      step: 1,
      route: '/household',
      title: '1/8: Shared Family Household & Invite Code',
      persona: 'maria',
      description: 'Santos Family Household: Nanay Maria (Owner / Budget Manager), Tatay Juan (Admin / Breadwinner), and Angela (Member / Working Student) share one budget using invite code SANTOS2026.',
      speech: 'Step 1: Here is the Shared Family Household. Maria, Juan, and Angela are connected to the same household using the unique invite code SANTOS2026.',
      duration: 11000,
    },
    {
      step: 2,
      route: '/household',
      title: '2/8: Multi-User Collaboration & Persona Switching',
      persona: 'juan',
      description: 'Switching active family member live! Notice the profile instantly switches to Tatay Juan (Breadwinner), who logs salary and pays utilities, then Angela (Student), then Nanay Maria.',
      speech: 'Step 2: Watch multi-user collaboration in real-time. We switch personas to Tatay Juan, then Angela, showing role-based permissions and shared data sync.',
      duration: 11000,
      onEnter: (login) => {
        login('juan');
        setTimeout(() => login('angela'), 4500);
        setTimeout(() => login('maria'), 8500);
      }
    },
    {
      step: 3,
      route: '/',
      title: '3/8: Consolidated Multi-Earner Family Cashflow',
      persona: 'maria',
      description: 'Consolidated finances: Juan salary (₱48,000) + Angela freelance (₱14,500) + Maria store (₱8,500) = PHP 71,000.00 Total Income. Minus PHP 19,700.00 Expenses = PHP 51,300.00 Net Savings!',
      speech: 'Step 3: On the Executive Dashboard, all family earners are consolidated. Monthly income totals 71,000 pesos, expenses are 19,700 pesos, leaving a healthy net savings of 51,300 pesos.',
      duration: 11000,
    },
    {
      step: 4,
      route: '/transactions',
      title: '4/8: Shared Transactions & Member Attribution',
      persona: 'maria',
      description: 'Every expense clearly identifies who logged it ("Logged by Juan Santos", "Logged by Maria Santos", "Logged by Angela"). Localized for Palengke, Meralco, Converge, and GCash.',
      speech: 'Step 4: In Shared Transactions, every entry shows member attribution tags, so families maintain complete spending transparency without missing receipts.',
      duration: 11000,
    },
    {
      step: 5,
      route: '/budgets',
      title: '5/8: Shared Budget Ceilings & Overspend Warnings',
      persona: 'maria',
      description: 'Household monthly target (₱65,000.00) with category limits. Color-coded thresholds: Green (<80%), Amber (80-99% near limit), Red (>100% over budget) alert all members.',
      speech: 'Step 5: The shared budget prevents overspending. Progress bars turn amber when nearing category limits and red when exceeded, protecting the entire household.',
      duration: 11000,
    },
    {
      step: 6,
      route: '/bills',
      title: '6/8: Collaborative Bills & Partial Payments',
      persona: 'maria',
      description: 'Shared utility obligations (Meralco, Maynilad). Supports partial installments (Angela Polytechnic Tuition ₱8,000 with ₱4,000 paid, remaining balance ₱4,000).',
      speech: 'Step 6: For household bills, TipidLink uniquely supports partial payments and installment tracking, preventing overdue penalty surcharges.',
      duration: 11000,
    },
    {
      step: 7,
      route: '/savings',
      title: '7/8: Shared Savings Goals & Completed Milestones',
      persona: 'maria',
      description: 'Family Emergency Fund (Pondong Pang-ipit, ₱68,500 / ₱100,000) and completed family milestones (Inverter Refrigerator Upgrade, 100% completed, ₱28,000 saved).',
      speech: 'Step 7: The shared savings module tracks the family emergency fund and celebrates completed goals like the new inverter refrigerator.',
      duration: 11000,
    },
    {
      step: 8,
      route: '/settings',
      title: '8/8: 1-Tap Universal PDF Export & ISO/IEC 25010 Certification',
      persona: 'maria',
      description: 'Universal 1-tap PDF Action Sheet for Android, iOS, and PC. Verified across 16 automated integration tests with 4.86 Excellent ISO/IEC 25010 rating.',
      speech: 'Step 8: Universal 1-tap PDF export generates print-ready statements for all devices. Verified with 16 automated tests and rated Excellent under ISO/IEC 25010.',
      duration: 12000,
    },
  ];

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const speak = (text) => {
    if (!voiceNarration || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });

      streamRef.current = stream;
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        saveRecordedVideo();
      };

      // If user clicks the native browser "Stop sharing" bar
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.warn('User cancelled screen capture:', err);
      return false;
    }
  };

  const saveRecordedVideo = () => {
    if (recordedChunksRef.current.length === 0) return;
    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tipidlink-shared-family-actual-system-demo-${new Date().toISOString().split('T')[0]}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    alert('Actual system video recording saved to your Downloads folder!');
  };

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (autoTourTimeoutRef.current) clearTimeout(autoTourTimeoutRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setIsAutoTourActive(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingCleanup();
  };

  // Launch Hands-Free Automated Live Tour
  const handleStartAutoTour = async () => {
    setIsOpen(false);
    const ok = await startScreenCapture();
    if (!ok) return;

    setIsAutoTourActive(true);
    setCurrentStepIdx(0);
    runAutoTourStep(0);
  };

  const runAutoTourStep = (stepIndex) => {
    if (stepIndex >= TOUR_STEPS.length) {
      // Completed all steps
      setTimeout(() => {
        stopRecording();
        navigate('/');
      }, 2000);
      return;
    }

    const current = TOUR_STEPS[stepIndex];
    setCurrentStepIdx(stepIndex);
    navigate(current.route);

    if (current.onEnter) {
      current.onEnter(loginAsDemo);
    } else if (current.persona) {
      loginAsDemo(current.persona);
    }

    speak(current.speech);

    autoTourTimeoutRef.current = setTimeout(() => {
      runAutoTourStep(stepIndex + 1);
    }, current.duration);
  };

  // Launch Freeform Manual Record
  const handleStartManualRecord = async () => {
    setIsOpen(false);
    await startScreenCapture();
  };

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Persistent Floating Camera Button (Bottom-Left) */}
      {!isRecording && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 lg:bottom-6 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-bold shadow-xl border border-rose-500/40 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer"
          title="Record actual system demonstration video with shared family features"
        >
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <Video className="h-4 w-4 text-rose-400" />
          <span className="hidden sm:inline">Record Shared Family System</span>
          <span className="sm:hidden">Demo Video</span>
        </button>
      )}

      {/* Floating Active Recording Bar (While Recording Actual System) */}
      {isRecording && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-slate-950/95 text-white px-4 py-2.5 shadow-2xl border border-rose-500/50 backdrop-blur-md animate-modal-pop">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-black text-rose-400">
              REC {formatSecs(recordingSeconds)}
            </span>
          </div>

          {isAutoTourActive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-300 border-l border-slate-700 pl-3">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span>{TOUR_STEPS[currentStepIdx]?.title}</span>
            </div>
          )}

          <button
            onClick={() => setVoiceNarration(!voiceNarration)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition cursor-pointer"
            title={voiceNarration ? 'Mute AI voice narration' : 'Enable AI voice narration'}
          >
            {voiceNarration ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 fill-white" />
            <span>Stop & Save Video</span>
          </button>
        </div>
      )}

      {/* Auto-Tour Live Caption Overlay at Screen Bottom */}
      {isRecording && isAutoTourActive && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] pointer-events-none animate-fade-in">
          <div className="rounded-2xl bg-slate-950/90 text-white p-3.5 shadow-2xl border border-emerald-500/40 backdrop-blur-md text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
              <Users className="h-3 w-3" />
              <span>{TOUR_STEPS[currentStepIdx]?.title}</span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">
              {TOUR_STEPS[currentStepIdx]?.description}
            </p>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Record Shared Family Actual System</h3>
                  <p className="text-xs text-emerald-200">Demonstrates multi-user family sync & core features</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {/* Option A: Auto Tour with Shared Family */}
              <button
                onClick={handleStartAutoTour}
                className="w-full text-left rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 p-4 border border-emerald-200 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Option 1: Complete Shared Family Auto-Tour (Recommended)
                  </span>
                  <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                    8 Core Steps
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Automatically drives the actual system through all core features: <strong>Family Member Roster</strong>, <strong>Invite Code (SANTOS2026)</strong>, <strong>Live Persona Switching</strong> (Maria, Juan, Angela), <strong>Multi-Earner Cashflow (₱71k)</strong>, <strong>Member Attribution</strong>, <strong>Budget Warnings</strong>, <strong>Partial Bills (Tuition)</strong>, <strong>Savings Milestones</strong>, and <strong>1-Tap PDF Export</strong>.
                </p>
              </button>

              {/* Option B: Freeform Record */}
              <button
                onClick={handleStartManualRecord}
                className="w-full text-left rounded-2xl bg-slate-50 hover:bg-slate-100 p-4 border border-slate-200 transition cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 text-rose-600" />
                    Option 2: Free-form Manual Screen Recording
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Starts recording the browser tab immediately with an on-screen timer. You freely demonstrate the shared family features at your own pace, then click "Stop & Save Video".
                </p>
              </button>

              {/* Windows native reminder */}
              <div className="rounded-xl bg-slate-100 p-3 text-[11px] text-slate-600 border border-slate-200 flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Windows MP4 Shortcut:</strong> Press <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">Win + Alt + R</code> on your keyboard anytime to record the screen directly into your Windows Videos folder.
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
