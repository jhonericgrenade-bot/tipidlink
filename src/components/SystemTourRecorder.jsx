import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Smartphone,
  FileText,
  Clock
} from 'lucide-react';

export const SystemTourRecorder = () => {
  const navigate = useNavigate();
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
      route: '/',
      title: '1/7: Executive Financial Dashboard',
      description: 'Santos Family consolidated finances: Income (PHP 71,000.00), Expenses (PHP 19,700.00), Net Cashflow (PHP +51,300.00), and Monthly Budget Utilization (30.3%).',
      speech: 'Step 1: Here is the live TipidLink Dashboard showing real-time income, expense, and net cashflow calculations.',
      duration: 10000,
    },
    {
      step: 2,
      route: '/transactions',
      title: '2/7: Household Transactions Engine',
      description: 'Multi-earner transaction records categorized for Filipino daily life (Palengke, Meralco, Converge, GCash, Maya). Instant sub-50ms filtering.',
      speech: 'Step 2: The transactions module records daily family expenses with instant client-side math.',
      duration: 10000,
    },
    {
      step: 3,
      route: '/budgets',
      title: '3/7: Visual Budget Limits & Proactive Alerts',
      description: 'Color-coded threshold indicators: Green (<80% safe), Amber (80-99% near limit), Red (>100% over budget) preventing accidental overspending.',
      speech: 'Step 3: Proactive color-coded budget limits prevent overspending before it occurs.',
      duration: 10000,
    },
    {
      step: 4,
      route: '/bills',
      title: '4/7: Bills Tracking & Partial Payments Reconciliation',
      description: 'Support for installment payments (Tuition PHP 8,000 with PHP 4,000 paid) and automated overdue penalty warnings (Maynilad).',
      speech: 'Step 4: Real-world bills support partial payments and automatic overdue alerts.',
      duration: 10000,
    },
    {
      step: 5,
      route: '/savings',
      title: '5/7: Savings Goals & Completed Milestones',
      description: 'Emergency safety net (68.5% funded) and completed milestones (Inverter Refrigerator 100% completed badge).',
      speech: 'Step 5: Shared savings goals track emergency funds and celebrate completed milestones.',
      duration: 10000,
    },
    {
      step: 6,
      route: '/household',
      title: '6/7: Household Collaboration & Role Security',
      description: 'Role-Based Access Control (Owner Maria, Admin Juan, Member Angela). Secure invite code (SANTOS2026) and PostgreSQL Row Level Security.',
      speech: 'Step 6: Role-based permissions safeguard family budget rules with PostgreSQL security.',
      duration: 10000,
    },
    {
      step: 7,
      route: '/settings',
      title: '7/7: 1-Tap Universal PDF Statements & Backup',
      description: 'Universal PDF reports with instant Preview, Download, and Print on iOS, Android, and Desktop without WinAnsi symbol corruption.',
      speech: 'Step 7: Universal 1-tap PDF statements provide print-ready reports across all devices. Demonstration completed.',
      duration: 10000,
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
    a.download = `tipidlink-actual-system-demo-${new Date().toISOString().split('T')[0]}.webm`;
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
          title="Record actual system demonstration video"
        >
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <Video className="h-4 w-4 text-rose-400" />
          <span className="hidden sm:inline">Record Actual System</span>
          <span className="sm:hidden">Video</span>
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
            <div className="hidden sm:block text-xs font-bold text-emerald-300 border-l border-slate-700 pl-3">
              {TOUR_STEPS[currentStepIdx]?.title}
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
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] pointer-events-none animate-fade-in">
          <div className="rounded-2xl bg-slate-900/90 text-white p-3.5 shadow-2xl border border-emerald-500/30 backdrop-blur-md text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {TOUR_STEPS[currentStepIdx]?.title}
            </span>
            <p className="text-xs text-slate-200 mt-0.5 leading-snug">
              {TOUR_STEPS[currentStepIdx]?.description}
            </p>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Record Actual System Video</h3>
                  <p className="text-xs text-rose-200">Captures the real running TipidLink application</p>
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
              {/* Option A: Auto Tour */}
              <button
                onClick={handleStartAutoTour}
                className="w-full text-left rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 p-4 border border-emerald-200 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Option 1: Automated Guided Auto-Tour (Hands-Free)
                  </span>
                  <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  The system automatically clicks and navigates across all 7 real pages (Dashboard, Transactions, Budgets, Bills, Savings, Household, PDF Export) while recording video with voiceover narration.
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
                    Option 2: Manual Free-form Screen Recording
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Starts recording the actual browser tab immediately. You freely click and show whatever features you wish, then click "Stop & Save Video".
                </p>
              </button>

              {/* Windows native reminder */}
              <div className="rounded-xl bg-slate-100 p-3 text-[11px] text-slate-600 border border-slate-200 flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Windows Shortcut:</strong> Press <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">Win + Alt + R</code> on your keyboard anytime to record this window as an MP4 directly to your Videos folder.
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
