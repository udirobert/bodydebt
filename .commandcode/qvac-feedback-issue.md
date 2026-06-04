# @qvac/sdk: 3.7 GB node_modules footprint + bare-runtime compatibility issues

## Summary

`@qvac/sdk` installs **~3.7 GB** of native ML runtime binaries into `node_modules/` as direct dependencies, even when only one runtime (e.g., `llm-llamacpp`) is used. Additionally, the SDK's use of `bare-runtime` creates bundler compatibility issues and produces unhelpful error messages when native addons fail to load.

**Environment:**
- `@qvac/sdk` v0.12.1
- Node.js v22.22.3
- macOS (Apple Silicon, arm64)
- Package manager: Bun v1.3.9
- Framework: Next.js 16 (Turbopack + webpack)

---

## Issue 1: All ML runtimes installed as direct dependencies (~3 GB wasted)

### What happened

`@qvac/sdk` lists **16 ML runtimes** as direct `dependencies`:

```
@qvac/classification-ggml, @qvac/decoder-audio, @qvac/diffusion-cpp,
@qvac/embed-llamacpp, @qvac/llm-llamacpp, @qvac/ocr-onnx,
@qvac/rag, @qvac/registry-client, @qvac/transcription-parakeet,
@qvac/transcription-whispercpp, @qvac/translation-nmtcpp,
@qvac/tts-ggml, @qvac/vla-ggml
```

Each runtime bundles prebuilt native binaries for **6+ platforms** (darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64, android-arm64, ios-arm64, etc.). On a Mac, `npm install @qvac/sdk` pulls ~3.7 GB of native binaries, most of which will never be loaded.

For comparison, our entire Next.js app (with React, Tailwind, wagmi, viem, MediaPipe, EZKL, shadcn, etc.) is ~2.5 GB.

### Impact

- Fresh `bun install` / `npm install` takes minutes and consumes several GB of disk
- CI builds are slow and storage-heavy
- Developers on limited disk space are blocked

### Suggestion

1. **Move ML runtimes to `optionalDependencies`** — package managers skip them if not needed
2. **Or publish separate entry packages** — `@qvac/llm-only`, `@qvac/tts-only`, etc. with a lightweight `@qvac/sdk-core`
3. **Or use platform-specific optional deps** (like `esbuild` does with `@esbuild/darwin-arm64`) so only the target platform's binaries are downloaded

---

## Issue 2: Unhelpful error when native addon fails to load

### What happened

On an Apple Silicon Mac where the shell runs under Rosetta (x86_64) but Node.js is native ARM (arm64), the `bare` runtime correctly selects the `darwin-arm64` prebuild, but then crashes with a raw `dlopen` error:

```
Uncaught Error: dlopen(.../node_modules/@qvac/llm-llamacpp/prebuilds/darwin-arm64/qvac__llm-llamacpp.bare, 0x0005):
  Library not loaded: /opt/homebrew/opt/openssl@3/lib/libssl.3.dylib
  Reason: tried:
    '/opt/homebrew/opt/openssl@3/lib/libssl.3.dylib' (no such file),
    '/usr/local/opt/openssl@3/lib/libssl.3.dylib' (mach-o file, but is an incompatible architecture
    (have 'x86_64', need 'arm64e' or 'arm64e.v1' or 'arm64' or 'arm64'))
```

This error is **not surfaced through the SDK's API**. Instead, `loadModel()` hangs for 30 seconds then throws:

```
RPC initialization timed out after 30000ms — the worker process may have failed to start
```

The real error is only visible in the child process's stderr, not in the thrown exception.

### Impact

- Developers see a generic timeout, not the real cause
- Debugging requires monitoring stderr separately or wrapping the SDK call in `child_process.fork()` to capture output

### Suggestion

1. **Catch `dlopen` / native load errors** during `loadModel` and surface them in the thrown exception
2. **Add a platform detection check** before loading the native addon — if the target platform's prebuild isn't available, throw early with a clear message
3. **Surface the child process stderr** in the timeout error (e.g., `"RPC timeout — stderr: Library not loaded: libssl.3.dylib"`)

---

## Issue 3: `bare-runtime` creates bundler compatibility issues

### What happened

The SDK runs inside `bare-runtime` (a custom Node.js-compatible runtime), not standard Node.js. This means:

- `require.addon()` is a bare-specific API
- `bare-imports.json` remaps `child_process`, `crypto`, `fs`, etc. to bare equivalents
- The dependency tree includes `bare-ffmpeg` (399 MB), `react-native-bare-kit` (326 MB), `rocksdb-native` (175 MB), etc.

In a Next.js project, we had to:
1. Add `@qvac/sdk` and 5+ transitive deps to `serverExternalPackages` in `next.config.ts`
2. Eventually give up on direct imports and use `child_process.fork()` with a standalone `.mjs` script to avoid bundler conflicts entirely

### Impact

- Significant configuration overhead for server-side usage
- Bundler analysis of bare-runtime internals causes build errors and slowdowns
- Developers unfamiliar with bare-runtime spend hours diagnosing compatibility issues

### Suggestion

1. **Document bundler compatibility requirements prominently** in the Quickstart guide
2. **Consider a "pure Node.js" mode** for server-side usage that avoids bare-runtime entirely
3. **Provide a server-side entry point** (e.g., `@qvac/sdk/server`) that uses standard Node.js APIs

---

## Workaround

We added a `postinstall` script that deletes unused runtimes and non-target platform prebuilds after every `bun install`:

```js
// scripts/trim-node-modules.mjs
// Removes: translation-nmtcpp, embed-llamacpp, vla-ggml, diffusion-cpp,
//          transcription-*, tts-ggml, ocr-onnx, classification-ggml,
//          decoder-audio, bare-ffmpeg, react-native-bare-kit
// Plus: non-arm64 prebuilds from llm-llamacpp
```

This reduces `node_modules/` from **6.9 GB → 2.5 GB** after install. It works, but it's fragile and will break if the SDK internally imports one of the removed packages at runtime.

---

## Versions

| Package | Version |
|---|---|
| `@qvac/sdk` | 0.12.1 |
| `@qvac/llm-llamacpp` | 0.22.0 |
| Node.js | 22.22.3 |
| Bun | 1.3.9 |
| OS | macOS (arm64, Apple Silicon) |

---

## Labels

`bug`, `enhancement`, `package-size`
