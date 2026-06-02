"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";
import { ManualProxy } from "@/components/hrv/ManualProxy";
import { useTerraConnect } from "@/components/hrv/useTerraConnect";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { useStreamingAnalysis } from "@/hooks/useStreamingAnalysis";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import type { HRVData } from "@/lib/types";

// ─── Source-to-display metadata ──────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; opacity: number; color: string }> = {
  terra:         { label: "Live from your wearable",       opacity: 1.0, color: "#4ADE80" },
  healthkit:     { label: "From your Apple Watch",         opacity: 1.0, color: "#4ADE80" },
  google_fit:    { label: "From your Android data",        opacity: 0.95, color: "#4ADE80" },
  garmin_export: { label: "From your Garmin export",       opacity: 0.90, color: "#F59E0B" },
  manual_proxy:  { label: "Based on how you reported feeling", opacity: 0.80, color: "#A8A29E" },
  demo:          { label: "Simulated Garmin data",         opacity: 1.0, color: "#4ADE80" },
};

// ─── HRV delta bar ────────────────────────────────────────────────────────────

function HRVDeltaBar({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  const isBad = pct <= -20;
  const color = isBad ? "#DC2626" : pct <= -10 ? "#EA580C" : "#4ADE80";
  const baseW = Math.max(10, 100 - abs);
  const obsW  = Math.min(90, abs);
  return (
    <div className="space-y-2 mt-3">
      <div className="flex justify-between text-[9px] uppercase tracking-widest font-mono" style={{ color: "#3a3835" }}>
        <span>Baseline</span>
        <span>Observed</span>
      </div>
      <div className="h-6 w-full rounded-lg flex overflow-hidden" style={{ backgroundColor: "#0A0A0B", border: "1px solid rgba(168,162,158,0.1)" }}>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${baseW}%`, backgroundColor: "rgba(74,222,128,0.18)", color: "#4ADE80" }}>
          base
        </div>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${obsW}%`, backgroundColor: color, color: "#fff" }}>
          {pct > 0 ? `+${pct}%` : `${pct}%`}
        </div>
      </div>
    </div>
  );
}

// ─── Garmin CSV upload panel ──────────────────────────────────────────────────

function GarminUpload({ onData, onSkip }: { onData: (d: HRVData) => void; onSkip: () => void }) {
  const [state, setState] = useState<"idle" | "parsing" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setState("parsing");
    try {
      const text = await file.text();
      const res = await fetch("/api/garmin/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text }),
      });
      const json = await res.json();
      if (!res.ok || !json.hrvData) {
        setErrMsg(json.message ?? "Couldn't read this file. Try a different export.");
        setState("error");
        return;
      }
      onData(json.hrvData as HRVData);
    } catch {
      setErrMsg("Something went wrong reading that file.");
      setState("error");
    }
  }, [onData]);

  return (
    <div className="flex flex-col gap-4">
      {/* Orb prompt */}
      <div className="text-center">
        <h3 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.3rem,5vw,1.6rem)", color: "#F5F5F4" }}>
          Garmin keeps your best data on your own device. Let&apos;s bring it in.
        </h3>
      </div>

      {/* Steps */}
      {[
        { n: 1, text: "Open Garmin Connect → Health Stats → Heart Rate Variability → Export CSV" },
        { n: 2, text: "Download the file to your phone" },
        { n: 3, text: "Upload it below" },
      ].map((s) => (
        <div key={s.n} className="flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(234,88,12,0.15)", color: "#EA580C" }}>{s.n}</span>
          <p className="text-sm" style={{ color: "#A8A29E" }}>{s.text}</p>
        </div>
      ))}

      {/* Error */}
      {state === "error" && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: "rgba(127,29,29,0.18)", border: "1.5px solid rgba(220,38,38,0.3)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <p className="text-xs" style={{ color: "#fca5a5" }}>{errMsg}</p>
        </div>
      )}

      {/* Upload button */}
      <input ref={inputRef} type="file" accept=".csv,.zip" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <motion.button whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        disabled={state === "parsing"}
        className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2"
        style={{ backgroundColor: state === "parsing" ? "#1C1C1F" : "#EA580C", color: state === "parsing" ? "#524F4C" : "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
        <Upload className="w-4 h-4" />
        {state === "parsing" ? "Reading file..." : "Upload Garmin CSV"}
      </motion.button>
      <button onClick={onSkip} className="w-full text-center text-[11px] py-2 font-medium" style={{ color: "#524F4C" }}>
        Skip — answer manually instead
      </button>
    </div>
  );
}

// ─── Connected result panel ───────────────────────────────────────────────────

function ConnectedPanel({ data, onContinue }: { data: HRVData; onContinue: () => void }) {
  const meta = SOURCE_META[data.source ?? "manual_proxy"];
  const isBad = (data.hrvDeltaPercent ?? 0) <= -20;
  const orbColor = isBad ? "#DC2626" : data.hrvDeltaPercent <= -10 ? "#EA580C" : "#4ADE80";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      {/* Source badge */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" style={{ color: meta.color }} />
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {/* Delta card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#A8A29E" }}>Last night</span>
        <div className="py-2 font-normal leading-none" style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", color: orbColor }}>
          {data.hrvDeltaPercent > 0 ? `+${data.hrvDeltaPercent}` : data.hrvDeltaPercent}%
        </div>
        <p className="text-xs" style={{ color: "#A8A29E" }}>
          {isBad
            ? "Your nervous system is still in recovery. This will factor into your prescription."
            : data.hrvDeltaPercent <= -10
            ? "Slightly below baseline — your body is processing something."
            : "Close to baseline. Recovery looking reasonable."}
        </p>
        <HRVDeltaBar pct={data.hrvDeltaPercent} />

        {data.sleepStages && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Deep",  val: data.sleepStages.deep,  color: "#EA580C" },
              { label: "REM",   val: data.sleepStages.rem,   color: "#F59E0B" },
              { label: "Light", val: data.sleepStages.light, color: "#A8A29E" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: "#0A0A0B" }}>
                <div className="text-[9px] uppercase tracking-widest" style={{ color: "#3a3835" }}>{s.label}</div>
                <div className="text-xs font-mono font-bold mt-0.5" style={{ color: s.color }}>{s.val}m</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} onClick={onContinue}
        className="w-full font-semibold text-sm rounded-2xl"
        style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
        Calculate my full score
      </motion.button>
    </motion.div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Layer = "picker" | "terra" | "google_fit" | "garmin" | "manual" | "connected" | "analyzing";

const DEVICE_OPTIONS = [
  { id: "apple",   name: "Apple Watch",          sub: "iPhone → Health app",                icon: "🍎", layer: "manual"     as Layer, note: "HealthKit web access coming soon"   },
  { id: "garmin",  name: "Garmin",               sub: "Forerunner, Fenix, Venu, Lily",      icon: "⌚", layer: "garmin"     as Layer, note: null },
  { id: "fitbit",  name: "Fitbit / Pixel Watch", sub: "Charge, Sense, Versa, Pixel Watch",  icon: "💚", layer: "google_fit" as Layer, note: null },
  { id: "android", name: "Android / Google Fit", sub: "Samsung, OnePlus, Pixel phones",     icon: "🤖", layer: "google_fit" as Layer, note: null },
  { id: "whoop",   name: "WHOOP / Oura",         sub: "WHOOP 4.0, Oura Gen 3+",             icon: "🔴", layer: "terra"      as Layer, note: "Requires Terra credentials"         },
  { id: "none",    name: "No device",            sub: "Answer a quick check-in instead",   icon: "🖐", layer: "manual"     as Layer, note: null },
];

export function HRVPullScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const {
    selectedStressors, faceAnalysis,
    setHrvData, setHrvSkipped, setAnalysis, setIsAnalyzing, isAnalyzing,
  } = useBodyDebtStore();

  const { runAnalysis } = useStreamingAnalysis();
  const { terra, openWidget } = useTerraConnect();
  const [layer, setLayer] = useState<Layer>("picker");
  const [resolvedHrv, setResolvedHrv] = useState<HRVData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Demo mode — pre-populate realistic data on mount
  useEffect(() => {
    if (!isDemoMode) return;
    fetch("/api/hrv/resolve?demo=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.hrvData) { setResolvedHrv(json.hrvData); setLayer("connected"); }
      })
      .catch(() => {});
  }, [isDemoMode]);

  // Google Fit — listen for popup postMessage
  useEffect(() => {
    const handler = async (ev: MessageEvent) => {
      if (ev.data?.type !== "GOOGLE_FIT_AUTH") return;
      if (ev.data.status !== "success" || !ev.data.accessToken) {
        setAnalysisError("Google Fit connection failed. Try the manual check-in.");
        setLayer("manual");
        return;
      }
      // Fetch data with the token
      const res = await fetch("/api/google-fit/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: ev.data.accessToken }),
      });
      const json = await res.json();
      if (json.hrvData) { setResolvedHrv(json.hrvData); setLayer("connected"); }
      else { setLayer("manual"); }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Terra connected → use resolved data
  useEffect(() => {
    if (terra.phase === "connected" && terra.hrvData) {
      setResolvedHrv(terra.hrvData);
      setLayer("connected");
    }
  }, [terra.phase, terra.hrvData]);

  const openGoogleFit = () => {
    const popup = window.open("/api/google-fit/auth", "google_fit_auth", "width=480,height=640,popup=1");
    if (!popup) {
      // Popup blocked — show manual proxy instead, user can still proceed
      setAnalysisError("Popup blocked by your browser. Use the manual check-in below instead.");
      setLayer("manual");
    }
  };

  const handleDeviceSelect = (opt: typeof DEVICE_OPTIONS[number]) => {
    if (opt.layer === "terra") { openWidget(); return; }
    if (opt.id === "fitbit" || opt.id === "android") { openGoogleFit(); return; }
    setLayer(opt.layer);
  };

  const handleManualData = (data: HRVData) => {
    setResolvedHrv(data);
    setLayer("connected");
  };

  const handleGarminData = (data: HRVData) => {
    setResolvedHrv(data);
    setLayer("connected");
  };

  const handleRunAnalysis = useCallback((hrv: HRVData | null, skipped: boolean) => {
    setLayer("analyzing");
    runAnalysis(hrv, skipped);
  }, [runAnalysis]);
  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button onClick={() => layer === "picker" ? router.push("/face-scan") : setLayer("picker")}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "#A8A29E", minHeight: "44px" }}>
          <ChevronLeft className="w-4 h-4" />
          {layer === "picker" ? "Back" : "Change device"}
        </button>
        <MiniOrb score={resolvedHrv ? Math.abs(resolvedHrv.hrvDeltaPercent ?? 0) : 0} size={28} forming={layer === "analyzing"} />
      </div>

      <div className="relative z-10 pt-3 pb-4">
        <ProgressBar current={5} total={5} />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Device picker ──────────────────────────────────────── */}
        {layer === "picker" && (
          <motion.div key="picker" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="mb-1">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem,5.5vw,1.75rem)", color: "#F5F5F4" }}>
                Your watch knows things I don&apos;t.
              </h2>
              <p className="text-xs mt-1.5" style={{ color: "#524F4C" }}>
                Connect for a more accurate score — or answer a quick check-in
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {DEVICE_OPTIONS.map((opt, i) => (
                <motion.button key={opt.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => handleDeviceSelect(opt)}
                  className="relative w-full rounded-2xl flex items-center text-left"
                  style={{ minHeight: "64px", padding: "14px 16px", backgroundColor: "#141416", border: "1.5px solid rgba(168,162,158,0.12)" }}>
                  <span className="text-xl mr-3.5 flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block" style={{ color: "#F5F5F4" }}>{opt.name}</span>
                    <span className="text-[11px] block mt-0.5" style={{ color: opt.note ? "#524F4C" : "#3a3835" }}>
                      {opt.note ?? opt.sub}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" style={{ color: "#3a3835" }} />
                </motion.button>
              ))}
            </div>

            <button onClick={() => handleRunAnalysis(null, true)}
              className="w-full text-center text-[11px] py-2.5 font-medium" style={{ color: "#524F4C" }}>
              Skip all — use fewer data points
            </button>
          </motion.div>
        )}

        {/* ── Garmin CSV ─────────────────────────────────────────── */}
        {layer === "garmin" && (
          <motion.div key="garmin" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            <GarminUpload onData={handleGarminData} onSkip={() => setLayer("manual")} />
          </motion.div>
        )}

        {/* ── Manual proxy ───────────────────────────────────────── */}
        {layer === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            <ManualProxy onComplete={handleManualData} />
          </motion.div>
        )}

        {/* ── Connected / result ─────────────────────────────────── */}
        {layer === "connected" && resolvedHrv && (
          <motion.div key="connected" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            {analysisError && (
              <div className="rounded-2xl p-4 mb-4 flex items-start gap-3"
                style={{ backgroundColor: "rgba(127,29,29,0.18)", border: "1.5px solid rgba(220,38,38,0.3)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                <div>
                  <p className="text-xs" style={{ color: "#fca5a5" }}>{analysisError}</p>
                  <button onClick={() => setAnalysisError(null)} className="text-[10px] mt-1 font-semibold" style={{ color: "#DC2626" }}>Dismiss</button>
                </div>
              </div>
            )}
            <ConnectedPanel data={resolvedHrv} onContinue={() => handleRunAnalysis(resolvedHrv, false)} />
          </motion.div>
        )}

        {/* ── Analyzing ──────────────────────────────────────────── */}
        {layer === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50">
            <AnalysisLoader
              hasFaceScan={!!faceAnalysis}
              hasHRV={!!resolvedHrv}
              stressorCount={selectedStressors.length}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
