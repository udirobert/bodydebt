"use client";

/**
 * StressorLedgerRow — input row for a single stressor.
 *
 * Replaces the card pattern in `stressor-card.tsx`. One row per stressor
 * in the intake flow: icon, label, sublabel, optional chevron, and a
 * live contribution number on the right when the row is selected.
 *
 * The expansion panel (sub-options) is rendered via `children` so this
 * primitive stays a thin meter and the screen owns the option wiring.
 *
 * Summary mode (read-only, used in dashboard) is intentionally not in
 * this primitive yet — Pass 2 will introduce it.
 */

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Stressor } from "@/lib/types";
import { fadeUp } from "@/lib/motion/protocol";
import { Collapse } from "@/components/ui/collapse";

export interface StressorLedgerRowProps {
  icon: string;
  label: string;
  sublabel: string;
  isSelected: boolean;
  /** Base points contribution to total debt. Positive adds, negative subtracts. */
  contribution: number;
  /** True when the row has sub-options that can be expanded. */
  hasExpansions?: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onToggleExpansion?: () => void;
  /** When true, render in a "recovered" tone (used for "care" stressor). */
  isCare?: boolean;
  /** Compact mode for two-column layouts: smaller icon, no sublabel, tighter padding. */
  compact?: boolean;
  children?: React.ReactNode;
}

function formatContribution(contribution: number): string {
  if (contribution > 0) return `+${contribution}`;
  if (contribution < 0) return `${contribution}`;
  return "0";
}

export function StressorLedgerRow({
  icon,
  label,
  sublabel,
  isSelected,
  contribution,
  hasExpansions = false,
  expanded = false,
  onToggle,
  onToggleExpansion,
  isCare = false,
  compact = false,
  children,
}: StressorLedgerRowProps) {
  const accent = isCare ? "var(--color-states-success)" : "var(--color-brand-primary)";
  const accentSoft = isCare ? "rgba(74,222,128,0.18)" : "rgba(234,88,12,0.18)";

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isSelected ? accentSoft : "var(--color-bg-surface)",
        border: `1.5px solid ${
          isSelected
            ? (isCare ? "rgba(74,222,128,0.35)" : "rgba(234,88,12,0.35)")
            : "rgba(168,162,158,0.1)"
        }`,
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      <div className="flex items-center" style={{ minHeight: compact ? 52 : 64 }}>
        {isSelected && (
          <div
            className="w-[3px] self-stretch flex-shrink-0 rounded-l-2xl"
            style={{ backgroundColor: accent }}
          />
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="flex items-center gap-2.5 flex-1 text-left"
          style={{
            WebkitTapHighlightColor: "transparent",
            padding: compact ? "10px 12px" : "14px 16px",
          }}
        >
          <span className="flex-shrink-0" style={{ fontSize: compact ? "1.25rem" : "1.5rem" }}>{icon}</span>
          <div className="flex-1 min-w-0">
            <span
              className="font-semibold block"
              style={{
                color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: compact ? "0.8125rem" : "0.875rem",
              }}
            >
              {label}
            </span>
            {!compact && (
              <span className="text-[10px] block mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
                {isSelected ? "Tap to remove" : sublabel}
              </span>
            )}
          </div>

          {/* Live contribution readout */}
          {isSelected && (
            <motion.span
              key={contribution}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="font-mono font-bold flex-shrink-0"
              style={{
                color: accent,
                fontSize: compact ? "0.625rem" : "0.75rem",
                marginRight: compact ? "2px" : "4px",
              }}
            >
              {formatContribution(contribution)}
            </motion.span>
          )}
        </motion.button>

        {hasExpansions && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) onToggle();
              onToggleExpansion?.();
            }}
            className="flex-shrink-0 transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              color: isSelected ? accent : "var(--color-text-faint)",
              padding: compact ? "10px 10px" : "16px 16px",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transitionDuration: "var(--duration-collapse)",
            }}
            aria-label={expanded ? "Collapse" : "Add detail"}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      <Collapse open={!!(expanded && children)}>
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}
        >
          {children}
        </div>
      </Collapse>
    </motion.div>
  );
}

export { type Stressor };
