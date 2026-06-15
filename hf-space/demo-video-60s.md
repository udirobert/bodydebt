# Body Debt — 60-Second One-Take Demo Script

Designed for a single screen recording with no cuts. Browser tab at 1920×1080, dark Space loaded, full screen.

---

## Pre-flight (60 seconds)

- [ ] Browser tab only, no other windows
- [ ] Space loaded fresh: `https://huggingface.co/spaces/build-small-hackathon/body-debt`
- [ ] Dark mode (toggle if needed — top right of the form)
- [ ] Hide bookmarks bar, full screen (Cmd+Ctrl+F in Chrome)
- [ ] Audio: optional low ambient hum or silence

---

## The script (60s)

| Time | You do | The Space shows |
|---|---|---|
| **0:00–0:05** | Sit. Stare. | Cold open on the dark hero number `0`. Breathing orb dim. |
| **0:05–0:10** | Voiceover (or on-screen text): "How much did last night cost you?" | Hold on `0`. |
| **0:10–0:14** | Click the **"Bad night"** preset chip. | Stressors auto-populate: drank, trained, slept badly. Trace: `parse_stressors — done`. |
| **0:14–0:17** | Click **"Calculate"** (orange button). | Trace ticks. |
| **0:17–0:22** | Watch. Don't touch anything. | Hero number animates **0 → 96**. Color shifts to deep red. Five system meters appear (Brain 96, Liver 42, Cardio 52, Muscular 48, Gut 45). |
| **0:22–0:30** | Click into the **face image upload** area and drop a pre-recorded tired-face JPG (have it on the desktop). | Face pill renders: EAR 0.19, brow 0.025, mouth_t 8.0. Stress: 57/100. |
| **0:30–0:32** | Hold. | Trace: `face_scan — done`. |
| **0:32–0:34** | Hold. | Triage plan reveals: `PRIORITY: Brain 96 / SECONDARY: Cardio 52 / AVOID: HIIT, alcohol`. |
| **0:34–0:50** | **HOLD. DO NOT TOUCH.** This is the show. | The right-most coach block streams the prescription token-by-token. Cursor blinks. SmolLM2-360M writing live. |
| **0:50–0:55** | Voiceover (or on-screen text): "360M parameters. Streams token-by-token. On your laptop." | Coach finishes streaming. |
| **0:55–1:00** | Scroll the prescription panel up to reveal the counterfactual: *"If you had slept 7+ hours, Brain debt would drop from 67 to 55."* | Counterfactual visible. |

## End card (overlay or quick cut, 5s)

```
🫀 Body Debt
SmolLM2-360M + a 553-parameter face MLP. On-device. No cloud.
huggingface.co/spaces/build-small-hackathon/body-debt
```

---

## Voiceover script (one paragraph, optional)

> "Body Debt quantifies your recovery cost across five biological systems. Tap what happened last night, get a single number, see which system is the actual problem. The streaming LLM on the right is a 360-million parameter model running locally. No cloud, no API, your data never leaves the browser. This is the same app I've been running on myself for two weeks."

## What to absolutely keep

- The **0 → 96 score reveal** (the visual punch)
- The **streaming LLM moment** (the proof — judges will replay this)
- The **counterfactual** (the cheapest wow in the app)

## What to skip if you run over

- Drop the face scan entirely. The streaming LLM is enough.
- Drop voiceover. Text-on-screen is more honest.
- Don't drop the end card link.

## Tired-face JPG tip

The "tired face" you upload doesn't have to be you. Grab a stock tired-face photo or a screenshot of yourself at 6am. The model just needs a frontal face with visible eyes and mouth. A 640×480 JPG at 200KB is plenty.
