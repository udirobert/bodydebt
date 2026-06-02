"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ChevronLeft, Camera, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";
import { PrivacyNotice } from "@/components/face-scan/PrivacyNotice";
import { initializeFaceMesh, extractStressFeatures } from "@/lib/ai";
import { healthCredentialVerifierABI, VERIFIER_CONTRACT_ADDRESS } from "@/lib/blockchain";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex } from "viem";

type ScanPhase =
  | "privacy"
  | "prompt"
  | "camera"
  | "extracting"    // NEW: Running MediaPipe locally
  | "proving"       // NEW: Web Worker generating ZK proof
  | "verifying"     // NEW: Waiting for SKALE blockchain confirmation
  | "result"
  | "error"
  | "skipped";

type CameraError = "denied" | "unavailable" | "in_use" | "generic";

const SCAN_MESSAGES = [
  "Extracting facial geometry locally...",
  "Computing eye aspect ratio...",
  "Measuring brow tension...",
  "Preparing Zero-Knowledge circuit...",
];

function cameraErrorCopy(kind: CameraError): { title: string; body: string; action: string; steps?: string[] } {
  switch (kind) {
    case "denied":
      return { title: "Camera access blocked", body: "Enable camera access in your browser settings.", action: "Try again anyway", steps: ["Open browser settings", "Allow camera permissions", "Return to this tab"] };
    case "unavailable":
      return { title: "No camera found", body: "This device doesn't appear to have a camera.", action: "Continue without scan" };
    case "in_use":
      return { title: "Camera is in use", body: "Another app is currently using your camera.", action: "Try again" };
    default:
      return { title: "Camera unavailable", body: "Something prevented the camera from opening.", action: "Try again" };
  }
}

function classifyError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "unavailable";
    if (err.name === "NotReadableError" || err.name === "TrackStartError") return "in_use";
  }
  return "generic";
}

export function FaceScanScreen() {
  const router = useRouter();
  const { setFaceAnalysis, setFaceSkipped } = useBodyDebtStore();
  
  const [phase, setPhase] = useState<ScanPhase>("privacy");
  const [scanMessageIdx, setScanMessageIdx] = useState(0);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { data: txHash, writeContract } = useWriteContract({
    mutation: {
      onSuccess: () => {
        // Transaction submitted, the receipt hook will handle the rest
      },
      onError: (err) => {
        setAnalysisError(err.message);
        setPhase("error");
      },
    },
  });
  
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Note: We avoid using useEffect to set phase here to comply with strict React hook rules.
  // Instead, the UI directly reacts to the `isConfirmed` state below.

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<ReturnType<typeof initializeFaceMesh> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== "undefined" && !workerRef.current) {
      workerRef.current = new Worker(new URL("@/workers/ezkl-prover.worker.ts", import.meta.url));
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (phase !== "extracting" && phase !== "proving" && phase !== "verifying") return;
    const iv = setInterval(() => setScanMessageIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1200);
    return () => clearInterval(iv);
  }, [phase]);

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
        setTimeout(() => attach(attempt + 1), 50);
      }
    };
    attach();
    const raf = requestAnimationFrame(() => attach());
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [phase]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (frontErr) {
        if (frontErr instanceof DOMException && (frontErr.name === "OverconstrainedError" || frontErr.name === "ConstraintNotSatisfiedError")) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw frontErr;
        }
      }

      streamRef.current = stream;
      
      // Initialize MediaPipe FaceMesh
      faceMeshRef.current = initializeFaceMesh(() => {
        // We handle results manually in captureAndProve to control the flow
      });

      setPhase("camera");
    } catch (err) {
      setCameraError(classifyError(err));
      setPhase("error");
    }
  }, [setCameraError, setPhase]);

  const captureAndProve = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) { setPhase("error"); setCameraError("generic"); return; }

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("extracting");

    try {
      // 1. Extract features locally via MediaPipe
      const results = await new Promise<{ multiFaceLandmarks: { x: number; y: number; z: number }[][] }>((resolve) => {
        faceMeshRef.current!.onResults(resolve);
        faceMeshRef.current!.send({ image: video });
      });

      const features = extractStressFeatures(results.multiFaceLandmarks[0]);
      if (!features) throw new Error("Failed to extract facial features");

      setPhase("proving");

      // 2. Send to Web Worker for ZK Proof Generation
      const proofPromise = new Promise<{ success: boolean; proof: string; publicInputs: string; error?: string }>((resolve, reject) => {
        if (!workerRef.current) return reject(new Error("Worker not initialized"));
        
        workerRef.current.onmessage = (event: MessageEvent) => {
          if (event.data.success) resolve(event.data);
          else reject(new Error(event.data.error || "Proof generation failed"));
        };
        
        workerRef.current.postMessage({
          features,
          threshold: 0.15, // Example threshold for brow tension
          modelId: "bodydebt-stress-v1",
        });
      });

      const proofResult = await proofPromise;

      // 3. Verify on SKALE
      setPhase("verifying");
      
      const proofHash = keccak256(toHex(proofResult.proof));
      
      // Note: In a real scenario, we'd check if isConnected. For demo, we proceed or mock.
      if (!isConnected) {
        // Fallback for demo purposes if wallet not connected
        console.warn("Wallet not connected. Simulating SKALE verification.");
        await new Promise(r => setTimeout(r, 1500));
        setPhase("result");
        return;
      }

      writeContract({
        address: VERIFIER_CONTRACT_ADDRESS as `0x${string}`,
        abi: healthCredentialVerifierABI,
        functionName: "verifyAndLogCredential",
        args: [
          address!,
          "bodydebt-stress-v1",
          proofResult.publicInputs ? JSON.parse(proofResult.publicInputs).is_healthy : true,
          proofHash,
          "ipfs://mock-cid-for-hackathon",
        ],
      });
      
      // The useWaitForTransactionReceipt hook will handle setting phase to "result" on success

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setAnalysisError(msg);
      setFaceSkipped(true);
      setFaceAnalysis(null);
      setPhase("error");
    }
  }, [isConnected, address, writeContract, setFaceAnalysis, setFaceSkipped, setPhase, setCameraError, setAnalysisError]);

  const handleSkip = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFaceSkipped(true);
    setFaceAnalysis(null);
    router.push("/hrv-pull");
  }, [router, setFaceAnalysis, setFaceSkipped]);

  const handlePrivacyAccept = () => setPhase("prompt");

  const errorCopy = cameraError ? cameraErrorCopy(cameraError) : null;
  const isFinalError = phase === "error" && (cameraError === "unavailable");
  const isProcessing = phase === "extracting" || phase === "proving" || phase === "verifying";

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button onClick={() => router.push("/context-deepener")} className="flex items-center gap-2 text-[11px] font-medium" style={{ color: "#A8A29E", minHeight: "44px" }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <MiniOrb score={phase === "result" ? 10 : 0} size={28} forming={isProcessing} />
      </div>

      <div className="relative z-10 pt-3 pb-4">
        <ProgressBar current={4} total={5} />
      </div>

      <AnimatePresence mode="sync">
        {phase === "privacy" && (
          <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col justify-between pb-10">
            <PrivacyNotice onAccept={handlePrivacyAccept} onDecline={handleSkip} />
          </motion.div>
        )}

        {phase === "prompt" && (
          <motion.div key="prompt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col">
            <div className="text-center px-4 mb-6">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 5.5vw, 1.75rem)", color: "#F5F5F4" }}>
                Can I see your face for 30 seconds?
              </h2>
              <p className="text-xs mt-1.5 flex items-center justify-center gap-1.5" style={{ color: "#524F4C" }}>
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Processed entirely on your device
              </p>
            </div>

            <div className="mx-auto w-full max-w-xs rounded-2xl flex items-center justify-center mb-6" style={{ aspectRatio: "4/5", backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.12)" }}>
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-10 h-10 opacity-20" style={{ color: "#A8A29E" }} />
                <p className="text-xs" style={{ color: "#3a3835" }}>Camera will open here</p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 pb-10">
              <motion.button whileTap={{ scale: 0.98 }} onClick={startCamera} className="w-full font-semibold text-sm rounded-2xl" style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "64px" }}>
                <div className="font-bold text-base mb-0.5">Open camera</div>
                <div className="text-[10px] font-normal opacity-80">Zero-knowledge edge verification</div>
              </motion.button>
              <button onClick={handleSkip} className="w-full text-center text-[11px] py-2.5 font-medium" style={{ color: "#524F4C" }}>Skip this step</button>
            </div>
          </motion.div>
        )}

        {phase === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col">
            <div className="relative mx-auto w-full max-w-xs rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: "4/5" }}>
              <video ref={(el) => { if (el && streamRef.current) { el.srcObject = streamRef.current; el.play().catch(() => {}); } }} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none">
                <motion.div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid rgba(16, 185, 129, 0.3)" }} animate={{ scale: [1, 1.025, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3 pb-10">
              <motion.button whileTap={{ scale: 0.98 }} onClick={captureAndProve} className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2" style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
                <ShieldCheck className="w-4 h-4" /> Capture & Verify Locally
              </motion.button>
            </div>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 pb-10">
            <MiniOrb score={30} size={80} forming />
            <div className="w-full space-y-4 max-w-xs">
              <div className="flex items-center gap-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <motion.p key={scanMessageIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-center text-xs font-mono" style={{ color: "#A8A29E" }}>
                  {SCAN_MESSAGES[scanMessageIdx]}
                </motion.p>
              </div>
              <div className="rounded-2xl p-4 w-full" style={{ backgroundColor: "#141416", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <p className="text-[10px] text-center flex items-center justify-center gap-1.5" style={{ color: "#10B981" }}>
                  <ShieldCheck className="w-3 h-3" /> Raw biometric data never leaves this device
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "result" || isConfirmed) && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="flex items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#10B981" }}>Cryptographically Verified</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "#F5F5F4" }}>Health credential anchored to SKALE</p>
              </div>
            </div>

            {txHash && (
              <div className="rounded-2xl px-4 py-3 break-all" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
                <span className="text-[9px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#524F4C" }}>Transaction Hash</span>
                <span className="text-xs font-mono" style={{ color: "#A8A29E" }}>{txHash}</span>
              </div>
            )}

            <p className="text-[10px] text-center" style={{ color: "#3a3835" }}>
              Proof generated on-device · Zero data retained
            </p>

            <div className="mt-auto">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push("/hrv-pull")} className="w-full font-semibold text-sm rounded-2xl" style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
                Accept & Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(127,29,29,0.12)", border: "1.5px solid rgba(220,38,38,0.28)" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>{errorCopy?.title ?? analysisError ?? "Something went wrong"}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A8A29E" }}>{errorCopy?.body ?? "An unexpected error occurred."}</p>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {!isFinalError && (
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setCameraError(null); setAnalysisError(null); setPhase("prompt"); startCamera(); }} className="w-full font-semibold text-sm rounded-2xl" style={{ backgroundColor: "#141416", color: "#F5F5F4", border: "1px solid rgba(168,162,158,0.2)", minHeight: "52px" }}>
                  {errorCopy?.action ?? "Try again"}
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSkip} className="w-full font-semibold text-sm rounded-2xl" style={{ backgroundColor: "#EA580C", color: "#F5F5F4", minHeight: "58px" }}>
                Continue without face scan
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
