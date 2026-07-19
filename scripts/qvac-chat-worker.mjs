#!/usr/bin/env node

/**
 * QVAC chat worker — lightweight single-turn chat for Mira.
 *
 * Unlike the multi-agent pipeline, this runs a single completion call
 * with the Mira persona system prompt and the user's message.
 * Streams tokens to stdout as JSON lines.
 *
 * Usage:
 *   node scripts/qvac-chat-worker.mjs '{"system":"...","message":"...","history":[...]}'
 *
 * Output: one JSON object per line to stdout:
 *   {"event":"token","data":{"text":"..."}}
 *   {"event":"done","data":{"full":"..."}}
 *   {"event":"error","data":{"error":"..."}}
 */

import { plugins, QWEN3_1_7B_INST_Q4 } from "@qvac/sdk";
import { llmPlugin } from "@qvac/sdk/llamacpp-completion/plugin";

const isBare = typeof Bare !== "undefined";
const argv = isBare ? Bare.argv : process.argv;

const { loadModel, completion, unloadModel } = plugins([llmPlugin]);

function send(event, data) {
  const line = JSON.stringify({ event, data });
  if (isBare) {
    console.log(line);
  } else {
    process.stdout.write(line + "\n");
  }
}

async function main() {
  const arg = argv[2] || "{}";
  let input;
  try {
    input = JSON.parse(arg);
  } catch {
    send("error", { error: "Invalid JSON input" });
    process.exit(1);
  }

  const system = input.system || "You are Mira.";
  const message = input.message || "";
  const history = Array.isArray(input.history) ? input.history : [];

  if (!message) {
    send("error", { error: "Missing message" });
    process.exit(1);
  }

  // Build the conversation: system prompt + history + current message
  const conversation = [
    ...history.map((h) => `${h.role === "user" ? "User" : "Mira"}: ${h.content}`),
    `User: ${message}`,
  ].join("\n\n");

  const prompt = `${system}\n\n${conversation}\n\nMira:`;

  try {
    await loadModel(QWEN3_1_7B_INST_Q4);
  } catch (err) {
    send("error", { error: `Failed to load model: ${err.message}` });
    process.exit(1);
  }

  let full = "";
  try {
    const response = completion({
      modelId: QWEN3_1_7B_INST_Q4,
      history: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 200,
    });

    const timeout = setTimeout(() => {
      send("done", { full });
      try { unloadModel(); } catch {}
      process.exit(0);
    }, 30_000);

    for await (const token of response.tokenStream) {
      full += token;
      send("token", { text: token });
    }

    clearTimeout(timeout);
    send("done", { full });
  } catch (err) {
    send("error", { error: err.message });
  } finally {
    try { unloadModel(); } catch {}
  }
}

main();
