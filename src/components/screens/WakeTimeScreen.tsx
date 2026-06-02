"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate, PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";

// ─── Time slots: 4:00 AM – 12:00 PM in 30-min increments ─────────────────────
function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 4; h <= 11; h++) {
    ["00", "30"].forEach((m) => {
      slots.push(`${h}:${m} ${h < 12 ? "AM" : "PM"}`);
    });
  }
  slots.push("12:00 PM");
  return slots;
}

const TIME_SLOTS = buildTimeSlots();
const DEFAULT_IDX = TIME_SLOTS.indexOf("7:30 AM");
const ITEM_H = 72; // px per slot — generous touch target
const VISIBLE = 5; // rows shown (2 above + selected + 2 below)

// ─── Floating dawn particle ───────────────────────────────────────────────────
function DawnParticle({ delay, x, size }: { delay: number; x: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, bottom: "10%",
        backgroundColor: "rgba(245,158,11,0.35)", filter: "blur(1px)",
      }}
      animate={{ y: [0, -180, -320], opacity: [0, 0.6, 0], scale: [0.6, 1, 0.4], x: [0, 12, -8] }}
      transition={{ duration: 5 + delay * 0.4, delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

// ─── Momentum drum picker ─────────────────────────────────────────────────────
function TimeDrum({ slots, selectedIdx, onSelect }: {
  slots: string[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  // y offset: 0 = first item centred. Positive y = scroll down (later times)
  const y = useMotionValue(-selectedIdx * ITEM_H);
  const isDragging = useRef(false);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  // Clamp index helper
  const clampIdx = (i: number) => Math.max(0, Math.min(slots.length - 1, i));

  // Snap to a given index with spring
  const snapTo = useCallback((idx: number, velocity = 0) => {
    const clamped = clampIdx(idx);
    animRef.current?.stop();
    animRef.current = animate(y, -clamped * ITEM_H, {
      type: "spring",
      velocity,
      stiffness: 260,
      damping: 28,
      restDelta: 0.5,
      onComplete: () => onSelect(clamped),
    });
    onSelect(clamped);
  }, [y, slots.length, onSelect]);

  // Keep synced when external selectedIdx changes (e.g. default)
  useEffect(() => {
    y.set(-selectedIdx * ITEM_H);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    isDragging.current = false;
    const rawIdx    = -y.get() / ITEM_H;
    const velocity  = -info.velocity.y / ITEM_H;
    // Apply momentum: project index forward by velocity
    const projected = rawIdx + velocity * 0.18;
    snapTo(Math.round(projected), info.velocity.y);
  };

  const handleTap = (i: number) => {
    if (!isDragging.current) snapTo(i);
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: ITEM_H * VISIBLE }}
    >
      {/* Selection highlight band */}
      <div
        className="absolute left-4 right-4 rounded-2xl pointer-events-none z-10"
        style={{
          top: "50%", transform: "translateY(-50%)", height: ITEM_H,
          background: "linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(245,158,11,0.13) 100%)",
          border: "1.5px solid rgba(234,88,12,0.4)",
          boxShadow: "0 0 24px rgba(234,88,12,0.12)",
        }}
      />
      {/* Accent lines */}
      <div className="absolute left-6 z-20 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)", height: 1, width: 20, backgroundColor: "rgba(234,88,12,0.6)" }} />
      <div className="absolute right-6 z-20 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)", height: 1, width: 20, backgroundColor: "rgba(234,88,12,0.6)" }} />

      {/* Fade masks */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        background: "linear-gradient(to bottom, #0A0A0B 0%, transparent 28%, transparent 72%, #0A0A0B 100%)",
      }} />

      {/* Draggable drum */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -(slots.length - 1) * ITEM_H, bottom: 0 }}
        dragElastic={0.08}
        style={{ y, paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}
        onDragStart={() => { isDragging.current = true; animRef.current?.stop(); }}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        {slots.map((slot, i) => {
          const dist = Math.abs(i - selectedIdx);
          const isSelected = i === selectedIdx;
          return (
            <motion.div
              key={slot}
              onClick={() => handleTap(i)}
              animate={{
                opacity: isSelected ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.2 : 0.08,
                scale:   isSelected ? 1 : dist === 1 ? 0.8 : 0.65,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full flex items-center justify-center font-normal"
              style={{
                height: ITEM_H,
                fontFamily: "var(--font-heading)",
                fontSize: isSelected ? "3rem" : dist === 1 ? "1.65rem" : "1.1rem",
                color: isSelected ? "#F5F5F4" : "#A8A29E",
                letterSpacing: isSelected ? "-0.025em" : "0",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {slot}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function WakeTimeScreen() {
  const router = useRouter();
  const { setWakeTime } = useBodyDebtStore();
  const [selectedIdx, setSelectedIdx] = useState(DEFAULT_IDX);

  const handleConfirm = () => {
    setWakeTime(TIME_SLOTS[selectedIdx]);
    router.push("/bed-time");
  };

  const selectedTime = TIME_SLOTS[selectedIdx];

  return (
    <div className="relative min-h-svh flex flex-col items-center overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>

      {/* Dawn radial glow */}
      <motion.div className="absolute pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8 }}
        style={{
          top: "-15%", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.22) 0%, rgba(234,88,12,0.12) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div className="absolute pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.5, delay: 0.4 }}
        style={{
          top: "30%", left: "50%", transform: "translateX(-50%)",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(234,88,12,0.1) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />

      {/* Floating particles */}
      {[{ delay: 0, x: "15%", size: 4 }, { delay: 1.2, x: "72%", size: 3 },
        { delay: 2.4, x: "40%", size: 5 }, { delay: 0.7, x: "58%", size: 3 },
        { delay: 3.1, x: "28%", size: 4 }, { delay: 1.8, x: "85%", size: 3 }]
        .map((p, i) => <DawnParticle key={i} {...p} />)}

      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 mt-16 mb-2"
      >
        <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 88, height: 88, position: "relative" }}>
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: "1px solid rgba(245,158,11,0.3)" }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute inset-2 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #FBBF24, #F59E0B 40%, #EA580C 80%, #1a0800 100%)",
              boxShadow: "0 0 32px 8px rgba(245,158,11,0.35), 0 0 60px 20px rgba(234,88,12,0.15)",
            }}
            animate={{ borderRadius: ["52% 48% 52% 48% / 50% 50% 50% 50%", "48% 52% 48% 52% / 52% 48% 52% 48%", "52% 48% 52% 48% / 50% 50% 50% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ inset: "22%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)", mixBlendMode: "screen" }}
            animate={{ opacity: [0.5, 0.9, 0.5], rotate: [0, 360] }}
            transition={{ opacity: { duration: 4, repeat: Infinity }, rotate: { duration: 12, repeat: Infinity, ease: "linear" } }} />
        </motion.div>
      </motion.div>

      {/* Prompt text */}
      <div className="relative z-10 text-center px-8 mb-6 space-y-2">
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "#F59E0B" }}>
          The orb is calibrating
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="font-normal leading-snug"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 6vw, 1.85rem)", color: "#F5F5F4", letterSpacing: "-0.01em" }}>
          What time did you wake up today?
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          className="text-xs" style={{ color: "#524F4C" }}>
          Swipe up or down · your recovery window is calculated from this
        </motion.p>
      </div>

      {/* Drum */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}
        className="relative z-10 w-full px-6 flex-1">
        <TimeDrum slots={TIME_SLOTS} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />

        {/* Live echo */}
        <AnimatePresence mode="wait">
          <motion.p key={selectedTime}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-center text-[11px] font-mono mt-3"
            style={{ color: "rgba(245,158,11,0.55)" }}>
            Woke at {selectedTime} · calculating your window
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="relative z-10 w-full px-6 pb-12 pt-5">
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleConfirm}
          className="w-full font-semibold rounded-2xl relative overflow-hidden"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "60px", fontSize: "15px" }}>
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }} />
          <span className="relative z-10">That&apos;s right</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
