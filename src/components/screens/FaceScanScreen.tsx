"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ChevronLeft, Camera, AlertTriangle, CameraOff } from "lucide-react";
import type { FaceAnalysisResult } from "@/lib/types";
import { request } from "@/lib/api/request";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";
import { PrivacyNotice } from "@/components/face-scan/PrivacyNotice";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanPhase =
  | "privacy"     // show privacy notice before any permission request
  | "prompt"      // privacy accepted, ready to open camera
  | "camera"      // live viewfinder
  | "scanning"    // frame captured, local animation
  | "analyzing"   // waiting for AI response
  | "result"      // AI returned result
  | "error"       // camera or AI error — user can retry or skip
  | "skipped";    // user declined

type CameraError =
  | "denied"       // user blocked permission
  | "unavailable"  // no camera device found
  | "in_use"       // camera already used by another app
  | "generic";     // anything else

// ─── Scan messages cycling during analysis ───────────────────────────────────

const SCAN_MESSAGES = [
  "Assessing periorbital region...",
  "Checking skin perfusion...",
  "Reading eye clarity...",
  "Detecting inflammation markers...",
  "Calibrating fatigue index...",
  "Cross-referencing signals...",
];

// ─── Platform detection ───────────────────────────────────────────────────────

function detectPlatform(): "ios" | "android" | "chrome-desktop" | "safari-desktop" | "firefox" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (isFirefox) return "firefox";
  if (isSafari) return "safari-desktop";
  if (isChrome) return "chrome-desktop";
  return "other";
}

function deniedRecoverySteps(): string[] {
  switch (detectPlatform()) {
    case "ios":
      return [
        "Open the iOS Settings app",
        "Scroll to Privacy & Security → Camera",
        "Find Safari (or your browser) and toggle it on",
        "Come back to this tab — the camera will open automatically",
      ];
    case "android":
      return [
        "Tap the lock icon or ⓘ in the address bar",
        "Tap Permissions → Camera → Allow",
        "The camera will open here automatically once allowed",
      ];
    case "chrome-desktop":
      return [
        "Click the camera icon or 🔒 in the address bar",
        "Set Camera to 'Allow'",
        "The camera opens here as soon as you confirm",
      ];
    case "safari-desktop":
      return [
        "In the menu bar: Safari → Settings for This Website",
        "Set Camera to 'Allow'",
        "Return to this tab — it will open automatically",
      ];
    case "firefox":
      return [
        "Click the 🔒 lock icon in the address bar",
        "Click 'Clear permissions'",
        "Reload the page — the permission prompt appears again",
      ];
    default:
      return [
        "Open your browser settings → Site Permissions → Camera",
        "Allow camera access for this site",
        "Return here — the camera opens automatically",
      ];
  }
}

// ─── Human-readable camera error copy ────────────────────────────────────────

function cameraErrorCopy(kind: CameraError): { title: string; body: string; action: string; steps?: string[] } {
  switch (kind) {
    case "denied":
      return {
        title: "Camera access blocked",
        body: "Enable camera access in your browser settings — this screen will open the camera automatically once you allow it. No need to reload.",
        action: "Try again anyway",
        steps: deniedRecoverySteps(),
      };
    case "unavailable":
      return {
        title: "No camera found",
        body: "This device doesn't appear to have a camera, or it isn't accessible. The face scan requires a front-facing camera.",
        action: "Continue without scan",
      };
    case "in_use":
      return {
        title: "Camera is in use",
        body: "Another app is currently using your camera. Close it and try again.",
        action: "Try again",
      };
    default:
      return {
        title: "Camera unavailable",
        body: "Something prevented the camera from opening. You can skip this step — your score will be based on your reported stressors.",
        action: "Try again",
      };
  }
}

function classifyError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")    return "unavailable";
    if (err.name === "NotReadableError" || err.name === "TrackStartError")      return "in_use";
  }
  return "generic";
}

// ─── Inline progress bar during scan ─────────────────────────────────────────

function ScanProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const steps = 40;
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setProgress(Math.min(100, Math.round((100 / steps) * frame)));
      if (frame >= steps) clearInterval(iv);
    }, 2500 / steps);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-[9px] uppercase tracking-widest font-mono" style={{ color: "#A8A29E" }}>
        <span>Analyzing biomarkers</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#EA580C" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FaceScanScreen() {
  const router = useRouter();
  const { setFaceAnalysis, setFaceSkipped } = useBodyDebtStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<ScanPhase>("privacy");
  const [scanMessageIdx, setScanMessageIdx] = useState(0);
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // On mount: check Permissions API — if already denied, skip straight to error
  // so the user sees recovery steps immediately without hitting getUserMedia first
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions.query({ name: "camera" as PermissionName }).then((status) => {
      if (status.state === "denied") {
        setCameraError("denied");
        setPhase("error");
      }
      // Watch for live changes (e.g. user enables in settings while on this screen)
      status.onchange = () => {
        if (status.state === "granted") {
          setCameraError(null);
          setPhase("prompt");
        }
      };
    }).catch(() => {
      // Permissions API not supported — silently continue, getUserMedia will handle it
    });
  }, []);

  // Rotate scan messages during analysis
  useEffect(() => {
    if (phase !== "scanning" && phase !== "analyzing") return;
    const iv = setInterval(() => setScanMessageIdx((i) => (i + 1) % SCAN_MESSAGES.length), 850);
    return () => clearInterval(iv);
  }, [phase]);

  // Attach stream to video element after phase transitions to "camera".
  // AnimatePresence delays mounting — poll until the element appears.
  useEffect(() => {
    if (phase !== "camera") return;
    if (!streamRef.current) return;
    let cancelled = false;

    const attach = (attempt = 0) => {
      if (cancelled) return;
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      } else if (attempt < 30) {
        // Retry up to 30 × 50ms = 1.5s while element hasn't mounted yet
        setTimeout(() => attach(attempt + 1), 50);
      }
    };

    // First attempt immediately, then via rAF for the next paint
    attach();
    const raf = requestAnimationFrame(() => attach());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Try front camera first; fall back to any camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (frontErr) {
        // Front camera failed — try any camera before giving up
        if (frontErr instanceof DOMException && (frontErr.name === "OverconstrainedError" || frontErr.name === "ConstraintNotSatisfiedError")) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw frontErr;
        }
      }

      streamRef.current = stream;
      setPhase("camera");
      // srcObject assigned after phase change via useEffect below
    } catch (err) {
      setCameraError(classifyError(err));
      setPhase("error");
    }
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Wait until video has real dimensions
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) { setPhase("error"); setCameraError("generic"); return; }

    // Mirror-flip to match the user's natural selfie orientation
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    // Stop camera immediately after capture — no lingering access
    streamRef.current?.getTracks().forEach((t) => t.stop());

    setPhase("scanning");

    // Local animation phase (2s) → then hit the API
    await new Promise((r) => setTimeout(r, 2000));
    setPhase("analyzing");
    setAnalysisError(null);

    try {
      const imageBase64 = canvas
        .toDataURL("image/jpeg", 0.8)
        .replace(/^data:image\/jpeg;base64,/, "");

      const res = await request("/api/face-scan", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });

      // request() may not be authenticated for guests — handle both 200 and error shapes
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const validated = data as FaceAnalysisResult;
      setResult(validated);
      setFaceAnalysis(validated);
      setPhase("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setAnalysisError(msg);
      // Face scan failure is non-fatal — fall back gracefully
      setFaceSkipped(true);
      setFaceAnalysis(null);
      setPhase("error");
    }
  }, [setFaceAnalysis, setFaceSkipped]);

  const handleSkip = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFaceSkipped(true);
    setFaceAnalysis(null);
    router.push("/hrv-pull");
  }, [router, setFaceAnalysis, setFaceSkipped]);

  const handlePrivacyAccept = () => setPhase("prompt");

  const inflammationLabel = (level: FaceAnalysisResult["inflammation"]) =>
    ({ none: "Clear", mild: "Mild", moderate: "Moderate", severe: "Severe" })[level] ?? level;

  const perfusionLabel = (level: FaceAnalysisResult["skinPerfusion"]) =>
    ({ good: "Good", low: "Low", very_low: "Very low" })[level] ?? level;

  const clarityLabel = (level: FaceAnalysisResult["eyeClarity"]) =>
    ({ clear: "Clear", fatigued: "Fatigued", very_fatigued: "Very fatigued" })[level] ?? level;

  const errorCopy = cameraError ? cameraErrorCopy(cameraError) : null;
  const isFinalError = phase === "error" && (cameraError === "unavailable");

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button
          onClick={() => router.push("/context-deepener")}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "#A8A29E", minHeight: "44px" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <MiniOrb
          score={result ? result.debtContribution * 2 : 0}
          size={28}
          forming={phase === "scanning" || phase === "analyzing"}
        />
      </div>

      {/* Progress */}
      <div className="relative z-10 pt-3 pb-4">
        <ProgressBar current={4} total={5} />
      </div>

      {/* Main content area — switches between phases */}
      <AnimatePresence mode="sync">

        {/* ── Privacy notice ──────────────────────────────────────── */}
        {phase === "privacy" && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col justify-between pb-10"
          >
            <PrivacyNotice onAccept={handlePrivacyAccept} onDecline={handleSkip} />
          </motion.div>
        )}

        {/* ── Prompt (accepted privacy, about to open camera) ─────── */}
        {phase === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col"
          >
            {/* Orb question */}
            <div className="text-center px-4 mb-6">
              <h2
                className="font-normal leading-snug"
                style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 5.5vw, 1.75rem)", color: "#F5F5F4" }}
              >
                Can I see your face for 30 seconds?
              </h2>
              <p className="text-xs mt-1.5" style={{ color: "#524F4C" }}>
                No image stored · just light and observation
              </p>
            </div>

            {/* Camera placeholder */}
            <div
              className="mx-auto w-full max-w-xs rounded-2xl flex items-center justify-center mb-6"
              style={{ aspectRatio: "4/5", backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.12)" }}
            >
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-10 h-10 opacity-20" style={{ color: "#A8A29E" }} />
                <p className="text-xs" style={{ color: "#3a3835" }}>Camera will open here</p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 pb-10">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startCamera}
                className="w-full font-semibold text-sm rounded-2xl"
                style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "64px" }}
              >
                <div className="font-bold text-base mb-0.5">Open camera</div>
                <div className="text-[10px] font-normal opacity-80">Adds confidence to your score</div>
              </motion.button>
              <button onClick={handleSkip} className="w-full text-center text-[11px] py-2.5 font-medium" style={{ color: "#524F4C" }}>
                Skip this step
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Live viewfinder ──────────────────────────────────────── */}
        {phase === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <div className="relative mx-auto w-full max-w-xs rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: "4/5" }}>
              <video
                ref={(el) => {
                  (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                  // Callback ref: bind stream the instant the element mounts into the DOM,
                  // bypassing the AnimatePresence timing gap.
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Breathing observer overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid rgba(234,88,12,0.22)" }}
                  animate={{ scale: [1, 1.025, 1], opacity: [0.22, 0.5, 0.22] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="absolute inset-3 rounded-xl" style={{ border: "1px solid rgba(234,88,12,0.12)" }}
                  animate={{ scale: [1, 1.04, 1], opacity: [0.12, 0.3, 0.12] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.7 }} />
                <motion.div className="absolute" style={{ width: "55%", height: "65%", top: "12%", left: "22.5%", border: "1px solid rgba(234,88,12,0.18)" }}
                  animate={{ borderRadius: ["50% 50% 45% 45% / 60% 60% 40% 40%", "48% 52% 48% 52% / 58% 62% 38% 42%", "50% 50% 45% 45% / 60% 60% 40% 40%"], opacity: [0.18, 0.35, 0.18] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
              </div>

              {/* Corners */}
              {["top-left","top-right","bottom-left","bottom-right"].map((pos) => (
                <div key={pos}
                  className={`absolute w-5 h-5 ${pos.includes("top") ? "top-4" : "bottom-4"} ${pos.includes("left") ? "left-4" : "right-4"} ${pos.includes("top") ? "border-t-2" : "border-b-2"} ${pos.includes("left") ? "border-l-2" : "border-r-2"}`}
                  style={{ borderColor: "rgba(168,162,158,0.3)" }} />
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 pb-10">
              <motion.button whileTap={{ scale: 0.98 }} onClick={captureAndAnalyze}
                className="w-full font-semibold text-sm rounded-2xl"
                style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
                Capture &amp; analyze
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Scanning / analyzing ─────────────────────────────────── */}
        {(phase === "scanning" || phase === "analyzing") && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 pb-10"
          >
            <MiniOrb score={30} size={80} forming />

            <div className="w-full space-y-4">
              <ScanProgressBar />
              <motion.p
                key={scanMessageIdx}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-center text-xs font-mono"
                style={{ color: "#524F4C" }}
              >
                {SCAN_MESSAGES[scanMessageIdx]}
              </motion.p>
            </div>

            <div className="rounded-2xl p-4 w-full" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
              <p className="text-[10px] text-center" style={{ color: "#3a3835" }}>
                Your image is being processed in memory and will not be stored.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Result ──────────────────────────────────────────────── */}
        {phase === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10"
          >
            {/* Orb observation header */}
            <div className="flex items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.25)" }}>
              <MiniOrb score={result.debtContribution * 2} size={40} />
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#EA580C" }}>I&apos;m seeing something</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "#F5F5F4" }}>{result.summary}</p>
              </div>
            </div>

            {/* Score contribution */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
              <span className="text-xs font-semibold" style={{ color: "#A8A29E" }}>Face scan contribution</span>
              <span className="text-lg font-bold font-mono" style={{ color: "#EA580C" }}>+{result.debtContribution} pts</span>
            </div>

            {/* Biomarker chips */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Inflammation",  value: inflammationLabel(result.inflammation) },
                { label: "Eye clarity",   value: clarityLabel(result.eyeClarity) },
                { label: "Puffiness",     value: inflammationLabel(result.periorbitalPuffiness as FaceAnalysisResult["inflammation"]) },
                { label: "Skin perfusion",value: perfusionLabel(result.skinPerfusion) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
                  <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#524F4C" }}>{item.label}</div>
                  <div className="text-sm font-semibold capitalize mt-0.5" style={{ color: "#F5F5F4" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Privacy reminder */}
            <p className="text-[10px] text-center" style={{ color: "#3a3835" }}>
              Image discarded · no data retained
            </p>

            <div className="mt-auto">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push("/hrv-pull")}
                className="w-full font-semibold text-sm rounded-2xl"
                style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
                Accept &amp; continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10"
          >
            <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(127,29,29,0.12)", border: "1.5px solid rgba(220,38,38,0.28)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(220,38,38,0.15)" }}>
                  {cameraError === "unavailable" ? <CameraOff className="w-5 h-5" style={{ color: "#DC2626" }} /> : <AlertTriangle className="w-5 h-5" style={{ color: "#DC2626" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
                    {errorCopy?.title ?? (analysisError ? "Analysis failed" : "Something went wrong")}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A8A29E" }}>
                    {errorCopy?.body ?? analysisError ?? "An unexpected error occurred."}
                  </p>

                  {/* Numbered recovery steps */}
                  {errorCopy?.steps && (
                    <ol className="mt-3 space-y-2">
                      {errorCopy.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-mono mt-0.5"
                            style={{ backgroundColor: "rgba(234,88,12,0.18)", color: "#EA580C" }}>
                            {i + 1}
                          </span>
                          <span className="text-xs leading-relaxed" style={{ color: "#A8A29E" }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>

            {/* Live watching indicator — only shown for denied permission */}
            {cameraError === "denied" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.2)" }}
              >
                {/* Pulsing dot */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#EA580C" }}
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "#EA580C" }}
                    animate={{ scale: [1, 2.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <p className="text-xs" style={{ color: "#A8A29E" }}>
                  Watching for camera access — this screen will activate automatically once you allow it
                </p>
              </motion.div>
            )}

            <p className="text-xs text-center" style={{ color: "#524F4C" }}>
              Face scan is optional. Your debt score works without it.
            </p>

            <div className="mt-auto flex flex-col gap-3">
              {!isFinalError && (
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { setCameraError(null); setAnalysisError(null); setPhase("prompt"); startCamera(); }}
                  className="w-full font-semibold text-sm rounded-2xl"
                  style={{ backgroundColor: "#141416", color: "#F5F5F4", border: "1px solid rgba(168,162,158,0.2)", fontFamily: "var(--font-body)", minHeight: "52px" }}>
                  {errorCopy?.action ?? "Try again"}
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSkip}
                className="w-full font-semibold text-sm rounded-2xl"
                style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
                Continue without face scan
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Skipped ───────────────────────────────────────────────── */}
        {phase === "skipped" && (
          <motion.div
            key="skipped"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 pb-10"
          >
            <p className="text-sm text-center" style={{ color: "#524F4C" }}>Face scan skipped.</p>
            <p className="text-xs text-center" style={{ color: "#3a3835" }}>Your score will be based on reported stressors only.</p>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push("/hrv-pull")}
              className="w-full font-semibold text-sm rounded-2xl mt-4"
              style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
              Continue
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
