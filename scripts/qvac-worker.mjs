#!/usr/bin/env node

/**
 * QVAC Edge AI worker — standalone script for local LLM inference.
 *
 * Called via child_process.fork() from the Next.js API route to avoid
 * bundling @qvac/sdk and its native dependencies (bare, esbuild).
 *
 * Usage:
 *   node scripts/qvac-worker.mjs '{"stressScore":62,"isHealthy":true,...}'
 *
 * Output: one JSON object per line to stdout:
 *   {"event":"progress","data":{"status":"downloading","percent":50}}
 *   {"event":"result","data":{"advice":"...","source":"qvac-local","model":"llama-3.2-1b-inst-q4"}}
 *
 * Exits 0 on success, 1 on error.
 */

import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";

function send(event, data) {
  process.stdout.write(JSON.stringify({ event, data }) + "\n");
}

async function main() {
  const input = JSON.parse(process.argv[2]);

  const prompt = buildPrompt(input)

  send("progress", { status: "downloading", loaded: 0, total: 0, percent: 0 });

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    modelType: "llamacpp-completion",
    modelConfig: {
      // TurboQuant: KV-cache quantization — up to 5x less memory
      // for the running context with near-zero accuracy loss.
      // https://qvac.tether.io/blog/turboquant-in-qvac-sdk-0-12-0-kv-cache-quantization-for-production-local-ai/
      "cache-type-k": "tbq4_0",
      "cache-type-v": "pq4_0",
    },
    onProgress: (p) => {
      send("progress", {
        status: p.status ?? "downloading",
        loaded: p.loaded,
        total: p.total,
        percent: p.percent,
      });
    },
  });

  send("progress", { status: "generating", percent: 100 });

  let result = "";
  const response = completion({
    modelId,
    history: [{ role: "user", content: prompt }],
    stream: true,
  });

  for await (const token of response.tokenStream) {
    result += token;
  }

  await unloadModel({ modelId });

  send("result", {
    advice: result,
    source: "qvac-local",
    model: "llama-3.2-1b-inst-q4",
  });
}

function buildPrompt(input) {
  const features = input.features ?? {};
  return `You are a health recovery coach. A user completed a ZK-verified facial stress scan.

Verified data:
- Stress score: ${input.stressScore}/100
- ZK result: ${input.isHealthy ? "Within healthy range" : "Elevated stress"}
- Eye fatigue: ${features.eyeFatigue ? "Yes" : "No"}
- Brow tension: ${features.browTension ? "Yes" : "No"}
- Reported stressors: ${(input.stressors ?? []).join(", ") || "None"}

Give 3 specific, actionable recovery tips in 2-3 sentences total. Direct, no caveats.`;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    send("error", { message: err.message });
    process.exit(1);
  });
