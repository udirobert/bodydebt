"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_DRAWER, DURATION_DRAWER_OPEN } from "@/lib/motion/protocol";
import type { MiraPresence } from "@/lib/mira/contract";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MiraChatPanelProps {
  open: boolean;
  onClose: () => void;
  presence: MiraPresence | null;
  context?: {
    debtScore?: number;
    phase?: string;
    prescription?: string | null;
  };
}

export function MiraChatPanel({ open, onClose, presence, context }: MiraChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamReply, setStreamReply] = useState("");
  const messagesRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const ask = useCallback(async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamReply("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    const updated = [...messagesRef.current, userMsg];
    messagesRef.current = updated;
    setMessages(updated);
    scrollToBottom();

    const history = updated.slice(-7, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/mira/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, history, context }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("event: token")) {
            // next data: line has the JSON
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                full += data.text;
                setStreamReply(full);
                scrollToBottom();
              }
            } catch {
              // skip
            }
          }
        }
      }

      if (full) {
        const assistantMsg: ChatMessage = { role: "assistant", content: full };
        const withReply = [...messagesRef.current, assistantMsg];
        messagesRef.current = withReply;
        setMessages(withReply);
      }
    } catch {
      const fallback = context?.prescription
        ? "Your recovery plan is ready. Start with one step from it."
        : "Focus on one rest step right now. Your body is asking for attention.";
      const fallbackMsg: ChatMessage = { role: "assistant", content: fallback };
      const withFallback = [...messagesRef.current, fallbackMsg];
      messagesRef.current = withFallback;
      setMessages(withFallback);
    } finally {
      setStreaming(false);
      setStreamReply("");
      scrollToBottom();
    }
  }, [input, streaming, context, scrollToBottom]);

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setStreamReply("");
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-2xl rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: DURATION_DRAWER_OPEN, ease: EASE_DRAWER }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: streaming
                      ? "var(--color-accent)"
                      : "var(--color-text-faint)",
                  }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    Mira
                  </p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
                    {streaming ? "Listening…" : "Recovery only — never medical advice"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Close
              </button>
            </div>

            {/* Presence label */}
            {presence && !streaming && messages.length === 0 && (
              <div className="mb-4 rounded-lg border-l-2 border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-4 py-3">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
                  Mira · {presence.label}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {presence.message}
                </p>
              </div>
            )}

            {/* Conversation thread */}
            <div
              ref={scrollRef}
              className="mb-4 max-h-[40vh] space-y-3 overflow-y-auto"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-[var(--color-bg-surface)]"
                        : "border-l-2 border-[var(--color-accent)] bg-[var(--color-bg-surface)]"
                    }`}
                    style={{ color: "var(--color-text)" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {/* Streaming reply */}
              {streaming && streamReply && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-xl border-l-2 border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm"
                    style={{ color: "var(--color-text)" }}
                  >
                    {streamReply}
                    <span className="ml-0.5 animate-pulse" style={{ color: "var(--color-accent)" }}>▍</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded-md border border-[var(--color-border)] px-4 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Clear
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
                placeholder={streaming ? "Listening…" : "What's on your mind…"}
                disabled={streaming}
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ color: "var(--color-text)" }}
              />
              <button
                onClick={ask}
                disabled={streaming || !input.trim()}
                className="rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ color: "var(--color-bg)" }}
              >
                {streaming ? "…" : "Ask Mira"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
