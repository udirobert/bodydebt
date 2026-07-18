/**
 * Famile Mira — shared identity contract.
 *
 * This file is the single source of truth for Mira's posture vocabulary
 * across Famile products. Each product renders Mira in its own material
 * and palette, but reads from this same state contract so that users
 * recognise Mira's grammar across products.
 *
 * Copy this file into each Famile product at `src/lib/mira/contract.ts`
 * (or `domain/agent/miraContract.ts` for non-Next.js products). When the
 * contract stabilises, migrate to a private `@famile/mira-contract`
 * package. Until then, keep this file in sync manually across repos.
 *
 * Design rules:
 *   - Mira is a presence, not a mascot. The orb is decorative; the
 *     textual `label` + `message` are the accessible source of meaning.
 *   - Postures are operational truth, not mood. Each posture reflects a
 *     real state in the product's domain, not a vibe.
 *   - One signature object per product. Orbura uses a debt gauge orb;
 *     Ardum uses a metaball shell; Sukari uses a translucent field orb.
 *     The shape differs; the posture grammar is shared.
 *   - prefers-reduced-motion renders a static, luminous form — never
 *     rely on motion alone to distinguish postures.
 */

// ─── Posture vocabulary ──────────────────────────────────────────────────────

/**
 * The core postures every Famile product should support. Product-specific
 * extensions live in `MiraPostureExtension` so the core set stays portable.
 */
export type MiraCorePosture =
  | "steady"    // idle, default, no active task
  | "offering"  // something is ready for the user (mission, prescription, recommendation)
  | "holding"   // deferred, non-binding — saved for later
  | "watching"  // attentive, waiting for the user's update
  | "completed"; // settled, done, logged

/**
 * Product-specific posture extensions. Each product may add postures that
 * map to domain states not covered by the core set. Keep these rare — if
 * a posture is useful across two products, promote it to the core set.
 */
export type MiraPostureExtension =
  // Ardum: clarifying an intention, processing input
  | "inquiry"
  // Ardum: coordination in flight (booking, inviting)
  | "gathering"
  // Ardum: setback absorbed, re-forming after a declined recommendation
  | "resolving"
  // Sukari: mission adjusted (made easier) after user feedback
  | "adapting";

export type MiraPosture = MiraCorePosture | MiraPostureExtension;

// ─── Reactions (transient, not persistent postures) ──────────────────────────

/**
 * One-shot reactions that play over the current posture, then fade.
 * The underlying posture does not change — the reaction is a flash.
 */
export type MiraReactionKind =
  | "setback"   // user declined or something failed
  | "relief"    // hold created, commitment recorded, mission completed
  | "deadline"  // hold expired, time pressure surfaced
  | "surprise"; // intention revised, unexpected signal

// ─── Activity (what Mira is doing right now) ─────────────────────────────────

export type MiraActivity =
  | "idle"
  | "processing"
  | "speaking"
  | "listening"
  | "arriving";

// ─── Render tiers ────────────────────────────────────────────────────────────

/**
 * How prominently Mira is rendered in the current context.
 *   hero     — large, full presence (onboarding, dedicated Mira surface)
 *   standard — medium, beside primary content (dashboard, mission card)
 *   inline   — small, beside a line of copy (nav, status row)
 */
export type MiraRenderTier = "hero" | "standard" | "inline";

// ─── Presence contract ───────────────────────────────────────────────────────

/**
 * The full presence state Mira renders from. Each product maps its own
 * domain state to this contract; the rendering layer reads only from here.
 */
export interface MiraPresence {
  posture: MiraPosture;
  label: string;       // one-word status, e.g. "Offering", "Holding"
  message: string;     // one-line copy, e.g. "Mira noticed a pattern."
  activity?: MiraActivity;
  reaction?: MiraReactionKind; // transient; omit when none is active
  valence?: number;            // -1 (settled) to +1 (disrupted); modulates motion intensity
}

// ─── Voice guidelines (not enforced in code) ─────────────────────────────────

/**
 * Mira's voice is consistent across products. The copy changes; the
 * register does not.
 *
 *   - Calm, observant, practical. Never urgent or theatrical.
 *   - Short sentences. One idea per line.
 *   - "Mira noticed…" / "Mira is holding…" / "Mira logged this."
 *     — third person, never "I" unless the product explicitly adopts first person.
 *   - Never diagnoses, prescribes, or changes a medication dose.
 *   - Never implies cross-product memory. Say "Mira in Sukari" if the
 *     boundary matters, not "Mira remembers from Ardum".
 *   - The orb is decorative to screen readers. The `label` + `message`
 *     are the accessible source of meaning.
 */
export const MIRA_VOICE_GUIDELINES = `
Mira voice:
- Calm, observant, practical. Never urgent or theatrical.
- Short sentences. One idea per line.
- Third person: "Mira noticed…", "Mira is holding…", "Mira logged this."
- Never diagnoses, prescribes, or changes a medication dose.
- Never implies cross-product memory. Say "Mira in <product>" if the boundary matters.
- The orb is decorative to screen readers. label + message are the accessible source.
` as const;

// ─── Posture metadata (shared rendering hints) ───────────────────────────────

/**
 * Shared metadata for each posture. Products override `material` (colors,
 * gradients) but should keep `breathMs` and `intent` consistent so the
 * rhythm of Mira reads the same across products.
 *
 *   breathMs — the loop duration of the orb's idle breath animation.
 *              Slower = calmer. Faster = more active.
 *   intent   — a human-readable description of what the posture means,
 *              for documentation and a11y fallbacks.
 */
export interface MiraPostureMeta {
  breathMs: number;
  intent: string;
}

export const MIRA_POSTURE_META: Record<MiraPosture, MiraPostureMeta> = {
  steady:    { breathMs: 6000, intent: "Idle, default, no active task." },
  offering:  { breathMs: 4000, intent: "Something is ready for the user." },
  holding:   { breathMs: 7000, intent: "Deferred, non-binding — saved for later." },
  watching:  { breathMs: 5000, intent: "Attentive, waiting for the user's update." },
  completed: { breathMs: 4500, intent: "Settled, done, logged." },
  inquiry:   { breathMs: 3500, intent: "Clarifying, processing input." },
  gathering: { breathMs: 3800, intent: "Coordination in flight." },
  resolving: { breathMs: 4200, intent: "Setback absorbed, re-forming." },
  adapting:  { breathMs: 4800, intent: "Mission adjusted after user feedback." },
};

// ─── Reduced-motion contract ─────────────────────────────────────────────────

/**
 * When prefers-reduced-motion is active, Mira renders as a static,
 * luminous form. The posture is still conveyed through:
 *   - the textual label + message (always present, always accessible)
 *   - a static color/shape per posture (no animation)
 *
 * Never rely on motion alone to distinguish postures.
 */
export const MIRA_REDUCED_MOTION_NOTE = `
Reduced-motion: render a static, luminous form. Posture is conveyed through
label + message and a static color/shape per posture. Never rely on motion
alone to distinguish postures.
` as const;
