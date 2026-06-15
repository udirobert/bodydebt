# Body Debt — Social Post Copy

The submission rules for the Build Small Hackathon require a social post. Below are drop-in options for X and LinkedIn. Pick the one that matches your voice. All variants include the required Space link.

---

## X / Twitter (long-form, 280-char segments)

### Variant A — punchy (recommended)

```
🫀 I built an app that quantifies your physiological debt after a bad night.

Alcohol. Training. Sleep. Stress. All weighted across 5 body systems.

Then a 360M-param local LLM streams your recovery prescription. On-device. No cloud. No API.

Try it: https://huggingface.co/spaces/build-small-hackathon/body-debt
```

### Variant B — credibility-first

```
Wrote 4 lessons from building a 360M health coach for myself:

1. The product is privacy first, model second
2. The agent trace is the product
3. Tiny models are great at structured output, bad at free-form
4. Counterfactual hints beat raw prescriptions

Full writeup + Space: https://huggingface.co/spaces/build-small-hackathon/body-debt
```

### Variant C — under 200 chars (for fast X)

```
Quantify your recovery cost after a bad night. 5 body systems. 360M-param local LLM. On-device. No cloud.

https://huggingface.co/spaces/build-small-hackathon/body-debt
```

---

## LinkedIn (longer, professional)

```
How much did last night cost you?

That's the question I built Body Debt to answer. You tap what happened — drank, trained, slept badly, stressed, ill — and the app gives you a single "body debt" score broken down across five biological systems (cardiovascular, brain, liver, muscular/CNS, gut).

Then a 360M-parameter local LLM streams a recovery prescription. On-device. No cloud. No API calls. The face scan uses MediaPipe on the webcam — no images leave the browser.

I shipped this for the Hugging Face Build Small Hackathon. The whole thing runs on a $300 Chromebook with no internet.

The 360M model is the right size for this product, not a compromise. Health data shouldn't round-trip through a server when you're undressed, hungover, or at 2am with a chest flutter.

Try it: https://huggingface.co/spaces/build-small-hackathon/body-debt

Full writeup of what I learned shipping this: [BLOG LINK]

#buildsmall #smollm #ondevice #health #ml
```

---

## Suggested hashtag set

`#buildsmall #buildsmallhackathon #smollm #ondevice #localai #healthtech`

Pick 3-4. LinkedIn rewards longer; X rewards fewer.

---

## Asset checklist for the post

- [ ] 30-second teaser video clip (see `demo-video-script.md` last section)
- [ ] Space link: `https://huggingface.co/spaces/build-small-hackathon/body-debt`
- [ ] Blog link: `https://huggingface.co/blog/build-small-hackathon/body-debt-field-notes` (after publish)
- [ ] GitHub link: `https://github.com/udirobert/bodydebt` (for the trail of Codex commits)
- [ ] One screenshot of the dark hero number with the system meters (extract a 1920×1080 frame from the demo video)
- [ ] One screenshot of the agent trace panel mid-stream

---

## Posting cadence (suggested)

1. **X thread** on submission day with the teaser video. Pin it.
2. **LinkedIn long-form** the same day with the full story.
3. **Hacker News** "Show HN" post 24 hours later, linking both.
4. **r/MachineLearning** discussion post 48 hours later, with the technical detail (the 553-param MLP, the SmolLM2 streaming, the ZK proof path on SKALE).
