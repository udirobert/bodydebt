#!/usr/bin/env node
/**
 * Populate linux-x64 prebuilds for @qvac/* packages.
 *
 * On Mac, npm only extracts prebuilds matching the host platform (darwin-arm64).
 * For our deploy to a linux-x64 Hetzner server, we need to copy the linux-x64
 * binaries from each @qvac/* package tarball.
 *
 * Run AFTER `npm install --omit=dev` and BEFORE rsyncing to the server.
 * Idempotent — safe to run multiple times.
 */

import { rmSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const NM = join(ROOT, "node_modules");

const PACKAGES = [
  "@qvac/llm-llamacpp",
  "@qvac/embed-llamacpp",
  "@qvac/translation-nmtcpp",
  "@qvac/vla-ggml",
  "@qvac/diffusion-cpp",
  "@qvac/transcription-whispercpp",
  "@qvac/transcription-parakeet",
  "@qvac/tts-ggml",
  "@qvac/ocr-onnx",
  "@qvac/classification-ggml",
];

let populated = 0;

for (const pkg of PACKAGES) {
  const pkgDir = join(NM, pkg);
  if (!existsSync(pkgDir)) continue;

  const pkgJson = JSON.parse(
    execSync(`cat ${join(pkgDir, "package.json")}`, { encoding: "utf8" })
  );
  const version = pkgJson.version;
  if (!version) continue;

  // Fetch the package tarball from the registry
  // npm tarball URL format: .../@scope/pkg/-/pkg-name-version.tgz
  // e.g. https://registry.npmjs.org/@qvac/llm-llamacpp/-/llm-llamacpp-0.22.1.tgz
  const scopeSegment = pkg.startsWith("@") ? pkg.split("/")[0].slice(1) : "";
  const pkgBase = pkg.split("/")[1];
  const tarballName = scopeSegment
    ? `${pkgBase}-${version}.tgz`
    : `${pkgBase}-${version}.tgz`;
  const tarballUrl = `https://registry.npmjs.org/${pkg}/-/${tarballName}`;
  const tarball = `/tmp/${pkg.replace("/", "_")}-${version}.tgz`;
  const extractDir = `/tmp/qvac_extract_${pkg.replace("/", "_").replace("@", "")}`;

  try {
    execSync(`curl -sSL -o ${tarball} ${tarballUrl}`, { stdio: "pipe" });
    execSync(`rm -rf ${extractDir} && mkdir -p ${extractDir} && tar -xzf ${tarball} -C ${extractDir}`, { stdio: "pipe" });

    const srcPrebuilds = join(extractDir, "package", "prebuilds", "linux-x64");
    if (!existsSync(srcPrebuilds)) continue;

    const dstPrebuilds = join(pkgDir, "prebuilds", "linux-x64");
    if (existsSync(dstPrebuilds)) {
      rmSync(dstPrebuilds, { recursive: true, force: true });
    }
    mkdirSync(dstPrebuilds, { recursive: true });
    execSync(`cp -r ${srcPrebuilds}/. ${dstPrebuilds}/`, { stdio: "pipe" });

    populated++;
  } catch (e) {
    console.warn(`[qvac:populate] ${pkg}@${version}: ${e.message}`);
  } finally {
    execSync(`rm -f ${tarball}; rm -rf ${extractDir}`, { stdio: "pipe" });
  }
}

console.log(`[qvac:populate] Populated linux-x64 prebuilds for ${populated} @qvac/* packages`);
