"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Stressor, StressorType } from "@/lib/types";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";

// ─── Acknowledgement copy — orb noticing, never congratulating ───────────────

const ACK_COPY: Record<string, string> = {
  // Alcohol types
  beer:        "Beer registered. Gut system flagged.",
  red_wine:    "Red wine noted. Adjusting histamine load.",
  white_wine:  "White wine logged. Moderate liver load.",
  spirits:     "Spirits — liver timeline extending.",
  cocktails:   "Cocktails — brain and blood sugar debt added.",
  champagne:   "Champagne registered. Gut carbonation noted.",
  // Counts
  "1-2":       "Light volume. Adjusting downward.",
  "3-4":       "Moderate volume confirmed.",
  "5+":        "High volume. All systems weighted.",
  "lost_count": "High debt. Confidence reduced.",
  // Training area
  legs:        "Leg day logged. CNS recovery added.",
  upper:       "Upper body logged. Moderate CNS load.",
  cardio:      "Cardio session. Heart rate recovery flagged.",
  hiit:        "HIIT logged. Cardiovascular and CNS both loaded.",
  full_body:   "Full body session. Heavy CNS debt added.",
  mobility:    "Mobility session — reducing your debt.",
  // Intensity
  easy:        "Easy intensity. Low systemic load.",
  hard:        "Hard session noted. Recovery window extends.",
  destroyed:   "Maximal effort — full CNS debt applied.",
  // Sleep
  under_4:     "Under 4hrs. Severe cognitive and gut debt.",
  "4-6":       "4–6hrs sleep. Meaningful cognitive load.",
  "6-7":       "6–7hrs. Mild sleep debt added.",
  // Stress
  yes:         "Stress still active. Cortisol remains elevated.",
  mostly_gone: "Stress mostly resolved. Minor residual load.",
  // Ill severity
  mild:        "Mild illness. Immune load added.",
  moderate:    "Moderate illness. Significant system load.",
  floored:     "Significant illness — high debt across all systems.",
  // Stressor top-level
  alcohol:     "Alcohol logged. Liver and brain systems weighted.",
  sleep:       "Poor sleep noted. Cognition debt added.",
  training:    "Training logged. Awaiting intensity detail.",
  stress:      "High stress registered. Brain load adjusted.",
  ill:         "Illness logged. Immune debt added.",
  care:        "Self-care logged. Reducing your total debt.",
};

// ─── Stressor config ──────────────────────────────────────────────────────────

interface SubOption {
  key: string;
  label: string;
}

interface StressorDef {
  type: StressorType;
  label:    string;
  sublabel: string;
  icon:     string;
  basePoints: number;
  expansions?: {
    field:   keyof Stressor;
    question: string;
    options: SubOption[];
  }[];
}

const STRESSORS: StressorDef[] = [
  {
    type: "alcohol", label: "Drank", sublabel: "Any amount, any type", icon: "🍺", basePoints: 32,
    expansions: [
      { field: "alcoholType",  question: "What?",          options: [
          { key: "beer",       label: "Beer"        },
          { key: "red_wine",   label: "Red wine"    },
          { key: "white_wine", label: "White wine"  },
          { key: "spirits",    label: "Spirits"     },
          { key: "cocktails",  label: "Cocktails"   },
          { key: "champagne",  label: "Champagne"   },
      ]},
      { field: "alcoholCount", question: "How many?",      options: [
          { key: "1-2",        label: "1–2"         },
          { key: "3-4",        label: "3–4"         },
          { key: "5+",         label: "5+"          },
          { key: "lost_count", label: "Lost count"  },
      ]},
    ],
  },
  {
    type: "training", label: "Trained", sublabel: "Gym, sport, intense activity", icon: "💪", basePoints: 18,
    expansions: [
      { field: "trainingArea",      question: "What?",      options: [
          { key: "legs",      label: "Legs"      },
          { key: "upper",     label: "Upper body"},
          { key: "cardio",    label: "Cardio"    },
          { key: "hiit",      label: "HIIT"      },
          { key: "full_body", label: "Full body" },
          { key: "mobility",  label: "Mobility"  },
      ]},
      { field: "trainingIntensity", question: "Intensity?", options: [
          { key: "easy",      label: "Easy"       },
          { key: "hard",      label: "Hard"       },
          { key: "destroyed", label: "Destroyed me"},
      ]},
    ],
  },
  {
    type: "sleep", label: "Slept badly", sublabel: "Under 7 hours or broken", icon: "😴", basePoints: 24,
    expansions: [
      { field: "sleepHours", question: "How many hours?", options: [
          { key: "under_4", label: "Under 4" },
          { key: "4-6",     label: "4–6"     },
          { key: "6-7",     label: "6–7"     },
      ]},
    ],
  },
  {
    type: "stress", label: "High stress", sublabel: "Work, anxiety, hard decisions", icon: "😤", basePoints: 14,
    expansions: [
      { field: "stressCarried", question: "Still carrying it?", options: [
          { key: "yes",        label: "Yes"         },
          { key: "mostly_gone",label: "Mostly gone" },
      ]},
    ],
  },
  {
    type: "ill", label: "Feeling ill", sublabel: "Cold, flu, or just off", icon: "🤒", basePoints: 35,
    expansions: [
      { field: "illSeverity", question: "How bad?", options: [
          { key: "mild",     label: "Mild"     },
          { key: "moderate", label: "Moderate" },
          { key: "floored",  label: "Floored"  },
      ]},
    ],
  },
  {
    type: "care", label: "Took care of myself", sublabel: "Good sleep, no drinks, low stress", icon: "✦", basePoints: -10,
  },
];

// ─── Live debt meter ───────────────────────────────────────────────────────────

function computeLiveScore(stressors: Stressor[]): number {
  let score = 0;
  for (const s of stressors) {
    const def = STRESSORS.find((d) => d.type === s.type);
    if (!def) continue;
    score += def.basePoints;
    if (s.type === "training" && s.trainingArea === "mobility") score -= def.basePoints * 1.5;
    if (s.type === "training" && s.trainingIntensity === "destroyed") score += 8;
    if (s.type === "alcohol" && s.alcoholType === "spirits") score += 6;
    if (s.type === "alcohol" && s.alcoholCount === "5+") score += 8;
    if (s.type === "alcohol" && s.alcoholCount === "lost_count") score += 12;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Single stressor card ────────────────────────────────────────────────────

function StressorCard({
  def,
  stressor,
  onToggle,
  onSubOption,
  showAck,
}: {
  def: StressorDef;
  stressor: Stressor | undefined;
  onToggle: () => void;
  onSubOption: (field: keyof Stressor, key: string) => void;
  showAck: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = !!stressor;
  const isCare = def.type === "care";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isSelected
          ? (isCare ? "rgba(74,222,128,0.07)" : "rgba(234,88,12,0.07)")
          : "#141416",
        border: `1.5px solid ${isSelected
          ? (isCare ? "rgba(74,222,128,0.35)" : "rgba(234,88,12,0.35)")
          : "rgba(168,162,158,0.1)"}`,
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      {/* Main row */}
      <div className="flex items-center" style={{ minHeight: 64 }}>
        {/* Left accent bar */}
        {isSelected && (
          <div
            className="w-[3px] self-stretch flex-shrink-0 rounded-l-2xl"
            style={{ backgroundColor: isCare ? "#4ADE80" : "#EA580C" }}
          />
        )}

        {/* Tap area */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left px-4 py-3.5"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <span className="text-2xl flex-shrink-0">{def.icon}</span>
          <div className="flex-1 min-w-0">
            <span
              className="text-sm font-semibold block"
              style={{ color: isSelected ? "#F5F5F4" : "#A8A29E" }}
            >
              {def.label}
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "#3a3835" }}>
              {def.sublabel}
            </span>
          </div>
        </motion.button>

        {/* Chevron — only on stressors with expansions */}
        {def.expansions && def.expansions.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) onToggle(); // auto-select on chevron tap
              setExpanded((v) => !v);
            }}
            className="pr-4 pl-2 py-4 flex-shrink-0"
            style={{ color: isSelected ? "#EA580C" : "#524F4C" }}
            aria-label={expanded ? "Collapse" : "Add detail"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Expansion panels */}
      <AnimatePresence initial={false}>
        {expanded && def.expansions && (
          <motion.div
            key="expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}
            >
              {def.expansions.map((exp) => {
                const current = stressor?.[exp.field as keyof Stressor] as string | undefined;
                return (
                  <div key={String(exp.field)}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2 mt-3" style={{ color: "#524F4C" }}>
                      {exp.question}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {exp.options.map((opt) => (
                        <motion.button
                          key={opt.key}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSubOption(exp.field as keyof Stressor, opt.key)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: current === opt.key
                              ? (isCare ? "rgba(74,222,128,0.2)" : "rgba(234,88,12,0.2)")
                              : "rgba(255,255,255,0.04)",
                            border: `1px solid ${current === opt.key
                              ? (isCare ? "rgba(74,222,128,0.5)" : "rgba(234,88,12,0.5)")
                              : "rgba(168,162,158,0.15)"}`,
                            color: current === opt.key ? "#F5F5F4" : "#A8A29E",
                            minHeight: "32px",
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acknowledgement line */}
      <AnimatePresence>
        {showAck && (
          <motion.p
            key="ack"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-3 text-[10px] font-mono italic"
            style={{ color: isCare ? "#4ADE80" : "#EA580C" }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Confidence signal ────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG = [
  { tier: "estimated",  dot: "◐", label: "Estimated",      color: "#524F4C" },
  { tier: "partial",    dot: "◑", label: "Partial picture", color: "#A8A29E" },
  { tier: "good",       dot: "◕", label: "Good read",       color: "#F59E0B" },
  { tier: "accurate",   dot: "●", label: "Accurate",        color: "#EA580C" },
  { tier: "precise",    dot: "●", label: "Precise",         color: "#4ADE80" },
] as const;

// ─── Main screen ──────────────────────────────────────────────────────────────

export function DebtIntakeScreen() {
  const router = useRouter();
  const {
    selectedStressors,
    toggleStressor,
    updateStressor,
    confidenceTier,
  } = useBodyDebtStore();

  // Acknowledgement line state — { key, text }
  const [ackLine, setAckLine] = useState<{ key: string; text: string } | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAck = (key: string) => {
    const text = ACK_COPY[key] ?? "";
    if (!text) return;
    if (ackTimer.current) clearTimeout(ackTimer.current);
    setAckLine({ key, text });
    ackTimer.current = setTimeout(() => setAckLine(null), 2200);
  };

  const handleToggle = (type: StressorType) => {
    toggleStressor(type);
    const isNowSelected = !selectedStressors.some((s) => s.type === type);
    if (isNowSelected) showAck(type);
  };

  const handleSubOption = (type: StressorType, field: keyof Stressor, optKey: string) => {
    updateStressor(type, { [field]: optKey } as Partial<Stressor>);
    showAck(optKey);
  };

  const hasSelection = selectedStressors.length > 0;
  const liveScore = computeLiveScore(selectedStressors);
  const confConfig = CONFIDENCE_CONFIG.find((c) => c.tier === confidenceTier) ?? CONFIDENCE_CONFIG[0];

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Nav + mini orb */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button
          onClick={() => router.push("/wake-time")}
          className="text-[11px] font-medium flex items-center gap-1"
          style={{ color: "#524F4C", minHeight: "44px" }}
        >
          ← Back
        </button>
        <MiniOrb score={liveScore} size={32} />
      </div>

      <div className="relative z-10 pt-3 pb-2">
        <ProgressBar current={2} total={5} />
      </div>

      {/* Orb question */}
      <div className="relative z-10 mb-5">
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.45rem, 5.5vw, 1.8rem)",
            color: "#F5F5F4",
            letterSpacing: "-0.01em",
          }}
        >
          What did you put your body through last night?
        </motion.h2>
        <p className="text-xs mt-1.5" style={{ color: "#524F4C" }}>
          Tap to log · chevron to add detail
        </p>
      </div>

      {/* Acknowledgement banner */}
      <div className="relative z-10 mb-3" style={{ minHeight: 24 }}>
        <AnimatePresence mode="wait">
          {ackLine && (
            <motion.p
              key={ackLine.key}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] font-mono italic"
              style={{ color: "#EA580C" }}
            >
              {ackLine.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Stressor cards */}
      <div className="relative z-10 flex flex-col gap-2.5 flex-1">
        {STRESSORS.map((def, i) => {
          const stressor = selectedStressors.find((s) => s.type === def.type);
          return (
            <motion.div
              key={def.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StressorCard
                def={def}
                stressor={stressor}
                onToggle={() => handleToggle(def.type)}
                onSubOption={(field, key) => handleSubOption(def.type, field, key)}
                showAck={ackLine?.key === def.type}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Confidence signal */}
      <div className="relative z-10 pt-4 pb-2 flex items-center justify-center gap-2">
        <span className="text-sm" style={{ color: confConfig.color }}>{confConfig.dot}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: confConfig.color }}>
          {confConfig.label}
        </span>
      </div>

      {/* CTA */}
      <div className="relative z-10 pb-10 pt-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/context-deepener")}
          disabled={!hasSelection}
          className="w-full font-semibold rounded-2xl"
          style={{
            backgroundColor: hasSelection ? "#EA580C" : "#141416",
            color: hasSelection ? "#F5F5F4" : "#524F4C",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
            border: hasSelection ? "none" : "1px solid rgba(168,162,158,0.1)",
            transition: "background-color 0.2s, color 0.2s",
          }}
        >
          {hasSelection ? "Continue" : "Select what hit you"}
        </motion.button>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-[11px] py-2.5 font-medium mt-1"
          style={{ color: "#524F4C" }}
        >
          Skip — view dashboard
        </button>
      </div>
    </div>
  );
}
