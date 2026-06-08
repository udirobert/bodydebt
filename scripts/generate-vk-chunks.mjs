#!/usr/bin/env node

/**
 * Convert public/ezkl/vk.key into bytes32 chunks for Halo2VerifierReusable.
 *
 * Outputs:
 * - public/ezkl/vk-chunks.json
 * - public/ezkl/vk-digest.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256 } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ezklDir = resolve(__dirname, "..", "public", "ezkl");
const vkPath = resolve(ezklDir, "vk.key");
const chunksPath = resolve(ezklDir, "vk-chunks.json");
const digestPath = resolve(ezklDir, "vk-digest.json");

if (!existsSync(vkPath)) {
  console.error("ERROR: public/ezkl/vk.key not found. Run python scripts/compile-circuit.py first.");
  process.exit(1);
}

mkdirSync(ezklDir, { recursive: true });

const vk = readFileSync(vkPath);
const chunks = [];
for (let offset = 0; offset < vk.length; offset += 32) {
  const chunk = Buffer.alloc(32);
  vk.copy(chunk, 0, offset, Math.min(offset + 32, vk.length));
  chunks.push(`0x${chunk.toString("hex")}`);
}

const concatenated = `0x${chunks.map((chunk) => chunk.slice(2)).join("")}`;
const digest = keccak256(concatenated);

writeFileSync(chunksPath, `${JSON.stringify(chunks, null, 2)}\n`);
writeFileSync(
  digestPath,
  `${JSON.stringify({ digest, chunks: chunks.length, sourceBytes: vk.length }, null, 2)}\n`
);

console.log(`Wrote ${chunks.length} chunks to ${chunksPath}`);
console.log(`VK digest: ${digest}`);
