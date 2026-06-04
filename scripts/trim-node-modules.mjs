#!/usr/bin/env node

/**
 * Trim unused packages from node_modules after install.
 *
 * @qvac/sdk bundles ML runtimes for every platform as direct dependencies.
 * This script removes the ones we don't use (translation, embedding, VLA,
 * diffusion, transcription, TTS, OCR) plus non-arm64 prebuilds and other
 * unnecessary packages.
 *
 * Called automatically via the "postinstall" script in package.json.
 * Safe to run repeatedly — idempotent.
 */

import { rmSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NM = join(ROOT, "node_modules");

function remove(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    return true;
  }
  return false;
}

let saved = 0;

// 1. Unused @qvac ML runtimes (~2.9 GB)
//    We only use llm-llamacpp for the health coach.
const qvacRuntimes = [
  "@qvac/translation-nmtcpp",
  "@qvac/embed-llamacpp",
  "@qvac/vla-ggml",
  "@qvac/diffusion-cpp",
  "@qvac/transcription-whispercpp",
  "@qvac/transcription-parakeet",
  "@qvac/tts-ggml",
  "@qvac/ocr-onnx",
  "@qvac/classification-ggml",
  "@qvac/decoder-audio",
];

for (const pkg of qvacRuntimes) {
  if (remove(join(NM, pkg))) saved++;
}

// 2. Non-arm64 platform prebuilds in llm-llamacpp (~515 MB)
const prebuildsDir = join(NM, "@qvac/llm-llamacpp/prebuilds");
if (existsSync(prebuildsDir)) {

  for (const platform of readdirSync(prebuildsDir)) {
    if (platform !== "darwin-arm64") {
      if (remove(join(prebuildsDir, platform))) saved++;
    }
  }
}

// 3. Unnecessary large packages (~796 MB)
const unnecessary = [
  "bare-ffmpeg",            // audio/video processing — not needed for LLM
  "react-native-bare-kit", // mobile only
  "bare-runtime-darwin-x64", // we're arm64
  "hermes-compiler",        // React Native JS engine — not used server-side
];

for (const pkg of unnecessary) {
  if (remove(join(NM, pkg))) saved++;
}

if (saved > 0) {
  console.log(`[trim] Removed ${saved} unused packages from node_modules`);
} else {
  console.log("[trim] Already clean");
}
