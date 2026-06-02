"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Trash2 } from "lucide-react";

const PRIVACY_POINTS = [
  {
    icon: Shield,
    title: "No image stored",
    body: "Your frame is analyzed in memory and discarded immediately. It never touches a database or storage service.",
  },
  {
    icon: Eye,
    title: "No identity detection",
    body: "The model assesses visible physical signals only — puffiness, perfusion, clarity. It cannot and does not identify you.",
  },
  {
    icon: Trash2,
    title: "Deleted after inference",
    body: "Once the AI returns its observations, the image data is garbage-collected server-side. No logs, no retention.",
  },
];

interface PrivacyNoticeProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function PrivacyNotice({ onAccept, onDecline }: PrivacyNoticeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <p
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "#EA580C" }}
        >
          Before we open the camera
        </p>
        <h3
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.5rem",
            color: "#F5F5F4",
          }}
        >
          Here&apos;s exactly what happens to your image.
        </h3>
      </div>

      {/* Privacy points */}
      <div className="flex flex-col gap-3">
        {PRIVACY_POINTS.map((pt, i) => (
          <motion.div
            key={pt.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: "#141416",
              border: "1px solid rgba(168,162,158,0.1)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(234,88,12,0.12)" }}
            >
              <pt.icon className="w-4 h-4" style={{ color: "#EA580C" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F5F5F4" }}>
                {pt.title}
              </p>
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: "#A8A29E" }}
              >
                {pt.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legal micro-note */}
      <p
        className="text-[10px] text-center leading-relaxed"
        style={{ color: "#524F4C" }}
      >
        Face scan is optional. Your debt score is calculated with or without it.
        Skipping has no penalty.
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAccept}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{
            backgroundColor: "#EA580C",
            color: "#F5F5F4",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
          }}
        >
          I understand — open camera
        </motion.button>
        <button
          onClick={onDecline}
          className="w-full text-center text-[11px] py-2.5 font-medium"
          style={{ color: "#524F4C" }}
        >
          Skip face scan
        </button>
      </div>
    </motion.div>
  );
}
