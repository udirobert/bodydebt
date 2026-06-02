# BODY DEBT — Share Widget Specification

## Product Context

BODY DEBT is a body recovery intelligence system. Users log stressors (alcohol, sleep, training, stress), optionally complete a face scan and morning check-in, and receive a physiological debt score (0–100) with a five-system recovery breakdown.

The share moment is the **primary growth mechanic**. It fires after the score is revealed on the dashboard, or from the dedicated Share Card screen. The goal: the card looks like something a friend shows you when they're being honest about their body — not a fitness brag. It should make the reader curious about their own number.

## Visual Language

- **Background:** Near-black `#0A0A0B`
- **Orb:** Radial gradient sphere. Low (0–40): amber `#F59E0B`. Mid (41–60): burnt orange `#EA580C`. High (61–100): deep red `#DC2626`.
- **Score number:** 5–7rem, DM Serif Display, matches orb color
- **Typography:** Instrument Sans (body), DM Serif Display (score/verdict)
- **Verdict:** DM Serif Display, off-white `#F5F5F4`, 1–1.25rem
- **Footer:** "bodydebt.app" — `#3a3835`, 8–9px, uppercase

## Share Payload Structure

```ts
share.compose({
  text: `My body debt today: ${score}. What's yours?\n\n${verdict}\nCleared: ${recoveryTime}\nbodydebt.app`,
  sourceAppId: "ikVxL2MkLETA7AjD",
  targetPath: "/dashboard",   // recipients land on their own dashboard
})
```

## Share Scenarios

### Scenario 1 — Standard Debt Score Card
**Trigger:** User taps "Share your score" on `/share-card`

**Payload facts:**
- `score`: integer 0–100
- `verdict`: one-line body state (e.g. "Your body is working overtime right now.")
- `recoveryTime`: human-readable (e.g. "6pm tonight")

**Card layout (9:16 vertical, Instagram Stories format):**
```
[9px uppercase] BODY DEBT
                           ← top-left

     [ ORB — 52% width ]
                           ← centred, ~38% from top

     [score number]
     [score band label]
     ─────────────────────
     [verdict text]
     [CLEARED: recoveryTime]
                           ← below orb

[bodydebt.app]   [What's yours?]
                           ← footer
```

**Share text:** "My body debt today: [score]. What's yours?"

**CTA copy on button:**
- score > 60: "Share your score · They should see this"
- score 31–60: "Share your score · Show them your number"
- score ≤ 30: "Share your score · Show someone what clean feels like"

---

### Scenario 2 — Boast Card (Green State)
**Trigger:** Debt score drops below 20 for the first time, or after 3+ consecutive high-debt days clearing

**Card layout:** Same as Scenario 1 but orb is deep calm green `#22c55e`, score shows in green, verdict reads "In the green." or "All systems clear."

**Share text:** "Debt score: [score]. All systems clear. What's yours?"

---

## Widget Design Notes

The widget must feel like a **genuine readout** — clinical precision, not wellness enthusiasm. Dark background mandatory. The orb should be the visual anchor. Score number should dominate. The verdict line is secondary. `bodydebt.app` footer drives the viral loop — it's the CTA for anyone who sees the card without context.

Do NOT render the card on a light/white background. Do NOT use pastel colours. Do NOT add decorative elements beyond what's in the layout spec.

## targetPath

`/dashboard` — when tapping the card from Eazo Mobile feed, recipient lands on the dashboard. If they haven't logged today, the intake prompt fires automatically. This closes the viral loop: see → curious → log → score → share.

## App ID

`ikVxL2MkLETA7AjD`
