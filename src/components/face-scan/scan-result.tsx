"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ShieldCheck, Loader2, CloudDownload } from "lucide-react";
import { getQvacAdvice } from "@/lib/api";
import type { QvacProgress } from "@/lib/api";

export function ScanResult({ txHash }: { txHash?: string }) {
  const router = useRouter();
  const { zkProof, selectedStressors } = useBodyDebtStore();
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceSource, setAdviceSource] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<QvacProgress | null>(null);

  useEffect(() => {
    if (advice) return;
    const abortController = new AbortController();
    const stressScore = zkProof?.stressScore != null
      ? Math.round(zkProof.stressScore * 100)
      : 50;

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
      // Guard against setting state after unmount
      if (!abortController.signal.aborted) {
        setDownloadProgress(progress);
      }
    }, abortController.signal).then((result) => {
      if (abortController.signal.aborted) return;
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

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 flex-1 flex flex-col gap-4 pb-10"
    >
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

      {txHash && (
        <div className="rounded-2xl px-4 py-3 break-all"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <span className="text-[9px] uppercase tracking-widest font-semibold block mb-1" style={{ color: "#524F4C" }}>
            Transaction Hash
          </span>
          <span className="text-xs font-mono" style={{ color: "#A8A29E" }}>{txHash}</span>
        </div>
      )}

      {/* Model download progress */}
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

      {/* Generating indicator */}
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

      {advice && (
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
