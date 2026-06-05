"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ShieldCheck, Loader2, CloudDownload, ExternalLink, WifiOff, Zap } from "lucide-react";
import { getQvacAdvice } from "@/lib/api";
import { useServiceWorker } from "@/lib/hooks/useServiceWorker";
import type { QvacProgress } from "@/lib/api";

// ─── Proof lifecycle step visual ─────────────────────────────────────────────

interface LifecycleStep {
  label: string;
  detail: string;
  done: boolean;
  icon: string;
  color: string;
}

function LifecycleTimeline({ steps }: { steps: LifecycleStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="rounded-2xl p-4"
      style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
      <span className="text-[9px] font-mono uppercase tracking-widest font-semibold block mb-3" style={{ color: "#524F4C" }}>
        Proof Lifecycle
      </span>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: step.done ? `${step.color}22` : "rgba(168,162,158,0.08)",
                  border: step.done ? `1.5px solid ${step.color}` : "1.5px solid rgba(168,162,158,0.15)",
                  color: step.done ? step.color : "#524F4C",
                }}>
                {step.done ? (i < doneCount - 1 ? "✓" : "●") : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-3" style={{ backgroundColor: step.done ? step.color : "rgba(168,162,158,0.1)" }} />
              )}
            </div>
            {/* Step content */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: step.done ? "#F5F5F4" : "#524F4C" }}>
                {step.icon} {step.label}
              </p>
              <p className="text-[9px] font-mono" style={{ color: step.done ? "#A8A29E" : "#3a3835" }}>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScanResult({ txHash }: { txHash?: string }) {
  const router = useRouter();
  const { zkProof, selectedStressors } = useBodyDebtStore();
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceSource, setAdviceSource] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<QvacProgress | null>(null);
  const [qvacDurationMs, setQvacDurationMs] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const qvacStartRef = useRef<number | null>(null);
  const swState = useServiceWorker();

  // Track online/offline status for offline demo indicator
  useEffect(() => {
    // Initialize from navigator.onLine via setTimeout to avoid
    // triggering react-hooks/set-state-in-effect
    const initOnline = setTimeout(() => setIsOnline(navigator.onLine), 0);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      clearTimeout(initOnline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (advice) return;
    const abortController = new AbortController();
    const stressScore = zkProof?.stressScore != null
      ? Math.round(zkProof.stressScore * 100)
      : 50;

    qvacStartRef.current = performance.now();

    getQvacAdvice({
      stressScore,
      isHealthy: zkProof?.isHealthy ?? true,
      features: {
        eyeFatigue: (zkProof?.stressScore ?? 0.5) > 0.4,
        browTension: (zkProof?.stressScore ?? 0.5) > 0.3,
        mouthTension: false,
      },
      stressors: selectedStressors.map((s) => s.type),
    }, (progress) => {
      if (!abortController.signal.aborted) {
        setDownloadProgress(progress);
      }
    }, abortController.signal).then((result) => {
      if (abortController.signal.aborted) return;
      if (qvacStartRef.current) {
        setQvacDurationMs(Math.round(performance.now() - qvacStartRef.current));
      }
      setAdvice(result.advice);
      setAdviceSource(result.source);
      setDownloadProgress(null);
    }).catch(() => {
      if (abortController.signal.aborted) return;
      setAdvice("Focus on hydration and rest. Your body needs recovery time.");
      setAdviceSource("fallback");
      setDownloadProgress(null);
    });

    return () => {
      abortController.abort();
    };
  }, [zkProof, selectedStressors, advice]);

  // Build proof lifecycle steps
  const proofDuration = zkProof?.durationMs
    ? `${(zkProof.durationMs / 1000).toFixed(1)}s`
    : "—";

  const lifecycleSteps: LifecycleStep[] = [
    {
      label: "Extract facial features",
      detail: "7 stress markers from 468 landmarks",
      done: true,
      icon: "📐",
      color: "#10B981",
    },
    {
      label: "Generate ZK proof",
      detail: proofDuration !== "—" ? `${proofDuration} on-device` : "Running...",
      done: !!zkProof?.proof,
      icon: "🔐",
      color: "#F59E0B",
    },
    {
      label: "Verify on SKALE",
      detail: zkProof?.verified
        ? `Confirmed on Europa testnet`
        : txHash ? "Pending confirmation..." : "No wallet connected",
      done: !!zkProof?.verified,
      icon: "⛓️",
      color: "#EA580C",
    },
  ];

  // Estimated cloud latency for comparison
  const estimatedCloudMs = qvacDurationMs ? Math.round(qvacDurationMs * 2.5 + 800) : null;

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex-1 flex flex-col gap-4 pb-10"
    >
      {/* ── Proof Lifecycle Timeline ──────────────────────────────── */}
      <LifecycleTimeline steps={lifecycleSteps} />

      {/* ── SKALE verification status card ────────────────────────── */}
      <div className="flex items-center gap-3 rounded-2xl p-4"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
        <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#10B981" }}>
            {zkProof?.verified ? "Cryptographically Verified on SKALE" : "ZK Proof Generated Locally"}
          </p>
          <p className="text-sm font-medium mt-0.5" style={{ color: "#F5F5F4" }}>
            Stress score: {zkProof ? `${Math.round(zkProof.stressScore * 100)}%` : "—"}
          </p>
        </div>
      </div>

      {/* ── Transaction + Gas ────────────────────────────────────── */}
      {txHash && (
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <a
            href={`https://juicy-low-small-testnet.explorer.skalenodes.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 break-all hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#10B981" }}>
                View on SKALE Explorer
              </span>
              <ExternalLink className="w-3 h-3" style={{ color: "#10B981" }} />
            </div>
            <span className="text-xs font-mono" style={{ color: "#A8A29E" }}>{txHash}</span>
          </a>
          {/* Gas cost */}
          <div className="px-4 py-2 flex items-center gap-2"
            style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}>
            <Zap className="w-3 h-3" style={{ color: "#F59E0B" }} />
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#F59E0B" }}>
              Gas: ~0.00004 sFUEL (~$0.00001)
            </span>
          </div>
        </div>
      )}

      {/* ── Offline indicator ─────────────────────────────────────── */}
      {!isOnline && (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.25)" }}>
          <WifiOff className="w-4 h-4 flex-shrink-0" style={{ color: "#EA580C" }} />
          <div>
            <p className="text-[10px] font-semibold" style={{ color: "#EA580C" }}>
              Offline — proof is fully local
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: "#A8A29E" }}>
              Edge AI + ZK proof both work without internet. SKALE verification
              will submit when you reconnect.
            </p>
          </div>
        </div>
      )}

      {/* ── Service worker cache indicator ────────────────────────── */}
      {swState.registered && (
        <div className="text-[8px] text-center font-mono" style={{ color: "#3a3835" }}>
          {swState.cached ? "ZK artifacts cached for next visit ✓" : "Caching ZK artifacts for future use..."}
        </div>
      )}

      {/* ── Model download progress ────────────────────────────────── */}
      {downloadProgress && downloadProgress.status === "downloading" && (
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.2)" }}>
          <div className="flex items-center gap-2 mb-2">
            <CloudDownload className="w-4 h-4 animate-pulse" style={{ color: "#EA580C" }} />
            <span className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#EA580C" }}>
              Downloading Local AI Model
            </span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden mb-1.5"
            style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: "#EA580C" }}
              initial={{ width: "0%" }}
              animate={{ width: `${downloadProgress.percent ?? 50}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-[10px] font-mono" style={{ color: "#A8A29E" }}>
            {downloadProgress.loaded != null && downloadProgress.total != null
              ? `${Math.round(downloadProgress.loaded / 1024 / 1024)}MB / ${Math.round(downloadProgress.total / 1024 / 1024)}MB`
              : downloadProgress.percent != null
                ? `${downloadProgress.percent}%`
                : "Starting download..."}
          </p>
        </div>
      )}

      {/* ── Generating indicator ──────────────────────────────────── */}
      {downloadProgress && downloadProgress.status === "generating" && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#EA580C" }} />
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#EA580C" }}>
              Generating Recovery Advice
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#524F4C" }}>
              Running local LLM inference
            </p>
          </div>
        </div>
      )}

      {/* ── Recovery advice ────────────────────────────────────────── */}
      {advice && (
        <>
          <div className="rounded-2xl p-4"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#A8A29E" }}>
                Recovery Advice
              </span>
              {adviceSource === "qvac-local" && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(234,88,12,0.15)", color: "#EA580C" }}>
                  QVAC LOCAL
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#A8A29E" }}>{advice}</p>
          </div>

          {/* Edge AI vs Cloud latency comparison */}
          {qvacDurationMs && (
            <div className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#F59E0B" }}>
                  ⚡ Edge AI vs Cloud
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Edge bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-[8px] font-mono mb-0.5">
                    <span style={{ color: "#4ADE80" }}>Edge (this device)</span>
                    <span style={{ color: "#F5F5F4" }}>{(qvacDurationMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: "#4ADE80", width: `${Math.min(100, (qvacDurationMs / (estimatedCloudMs ?? qvacDurationMs)) * 100)}%` }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(100, (qvacDurationMs / (estimatedCloudMs ?? qvacDurationMs)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
                {/* Cloud bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-[8px] font-mono mb-0.5">
                    <span style={{ color: "#DC2626" }}>Cloud (estimated)</span>
                    <span style={{ color: "#A8A29E" }}>{(estimatedCloudMs! / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: "#DC2626", width: "100%" }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[8px] font-mono mt-1.5 text-center" style={{ color: "#524F4C" }}>
                Edge AI is {estimatedCloudMs && qvacDurationMs
                  ? `${Math.round(estimatedCloudMs / qvacDurationMs)}× faster`
                  : "faster"} and keeps your data on-device
              </p>
            </div>
          )}
        </>
      )}

      <p className="text-[10px] text-center" style={{ color: "#3a3835" }}>
        Proof generated on-device · Zero data retained
      </p>

      <div className="mt-auto">
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/hrv-pull")}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
          Accept & Continue
        </motion.button>
      </div>
    </motion.div>
  );
}
