# Body Debt — Demo Video Script

**Length target:** 75 seconds. **Aspect:** 16:9, 1920×1080. **Audio:** optional voiceover or text-on-screen.

**Recording tool:** Loom, OBS, or QuickTime Player. The Space itself is the entire visual.

---

## Pre-recording checklist

- [ ] Open the Space in a clean browser window (1920×1080, dark mode)
- [ ] Hide tabs and bookmarks
- [ ] Close notifications
- [ ] Use a clean-shaven face for the webcam capture
- [ ] Have a cup of coffee and your face ready for the "tired" shot

---

## SHOT 1 — HOOK (0:00–0:08, 8s)

**On screen (text overlay, lower third, large sans-serif):**

> "How much did last night cost you?"

**Visual:** cold-open on the empty dark hero number (`0`) in the Body Debt app. Hold for 2 seconds.

**Action:** no movement, just the dim breathing-orb animation. Audio: low ambient hum.

---

## SHOT 2 — TAP A PRESET (0:08–0:18, 10s)

**Visual:** the stressor intake form on the left, dark theme.

**Action:**

1. Click the "**Bad night**" preset chip (top of the form). Watch the stressors auto-populate: drank, trained, slept badly.
2. The trace panel on the right ticks: `parse_stressors — done`.

**On screen (text overlay, lower-left):**

> "Tap a preset. We log the night."

---

## SHOT 3 — LIVE SCORE BUILDS (0:18–0:32, 14s)

**Visual:** the center hero number.

**Action:** click the orange "**Calculate**" button.

**Sequence to capture:**

- (0.1s) Trace: `compute_live_score — active` (pulsing dot)
- (0.5s) Hero number animates from `0` to `96` (camera shake / scale-up)
- (0.7s) Trace: `compute_live_score — done · score=96/100`
- (1.0s) Color shifts to deep red (`#991B1B`), the critical tier. The breathing orb glows red.
- (1.5s) Five system meters appear below: Brain 96, Liver 42, Cardio 52, Muscular 48, Gut 45.
- (2.5s) Trace: `triage_plan — active`

**On screen (text overlay, lower-right, 3s):**

> "Five biological systems. One number."

---

## SHOT 4 — FACE SCAN (0:32–0:45, 13s)

**Visual:** webcam capture panel.

**Action:**

1. Click "**Capture**" or upload a pre-recorded tired-face JPG. The image is from the demo asset bundle.
2. The face panel renders a "face-pill" with the geometry features: `EAR 0.19, brow 0.025, mouth_t 8.0, ...`
3. The face stress score renders: `57/100 — stressed`.
4. Trace: `face_scan — done · stress=57/100`.

**On screen (text overlay, upper-right, 3s):**

> "On-device. No image leaves the browser."

---

## SHOT 5 — STREAMING LLM COACH (0:45–1:00, 15s)

**Visual:** the prescription panel on the right, the agent trace on the far right.

**Action:**

1. Trace: `triage_plan — done · PRIORITY · SECONDARY · AVOID`
2. The plan card snaps into view: `PRIORITY: Brain 96/100 / SECONDARY: Cardiovascular 52/100 / AVOID: alcohol, HIIT`.
3. Trace: `llm_coach — active · SmolLM2-360M local`
4. The right-most coach block streams the prescription token-by-token. Cursor blinks.

**Capture this with a steady hold for 5 seconds. The token stream is the single most impressive visual in the demo.**

**On screen (text overlay, lower-left, 4s):**

> "360M parameters. Streams token-by-token. On your laptop."

---

## SHOT 6 — COUNTERFACTUAL (1:00–1:10, 10s)

**Visual:** the counterfactual block under the hero.

**Action:** the counterfactual reveals:

> "If you had slept 7+ hours, Brain debt would drop from 67 to 55."

**On screen (text overlay, lower-right, 3s):**

> "The single highest-leverage change."

---

## SHOT 7 — END CARD (1:10–1:15, 5s)

**Visual:** hold on the full dark UI for 3 seconds, then cut to:

```
🫀 Body Debt
huggingface.co/spaces/build-small-hackathon/body-debt
github.com/udirobert/bodydebt

Built for the Build Small Hackathon.
SmolLM2-360M + a 553-parameter face MLP. On-device. No cloud.
```

**On screen:** the Space link and the GitHub link in monospace. Fade in 0.5s, hold 4s, fade out 0.5s.

---

## Capture tips

- **The streaming LLM moment is the most important visual.** Make sure the camera holds steady through the full token stream.
- **The trace panel is intentional UI design** — don't hide it. It's the "agent" the judges will look for.
- **Show the face scan as a real capture, not a placeholder.** Judges can tell.
- **Don't voice over everything.** Some text-on-screen is more honest.

## What to cut if you run over 75s

- Drop SHOT 4 (face scan) entirely. The face scan is cool but the streaming LLM is the show.
- Compress SHOT 7 to 3s with a hard cut.
- Don't cut SHOT 5. The token stream is the proof.

## What to record separately for a 30s teaser (for the X/LinkedIn post)

Just SHOTS 1, 3 (final score), 5 (LLM stream), 7. 30 seconds, no audio, just the visual punch. Score reveal → token stream → end card. That's the teaser.
