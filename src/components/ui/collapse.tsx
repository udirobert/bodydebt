"use client";

import { cn } from "@/utils/utils";

/**
 * Height collapse via CSS grid-rows (no layout thrash from animating height).
 * Keep children mounted; content is clipped when closed.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] ease-[cubic-bezier(0.22,1,0.36,1)]",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className
      )}
      style={{ transitionDuration: "var(--duration-collapse)" }}
      aria-hidden={!open}
      {...(!open ? { inert: true as const } : {})}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
