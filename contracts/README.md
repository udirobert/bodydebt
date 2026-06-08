# Smart Contracts — Deployment

## Contracts

| Contract | File | Purpose |
|---|---|---|
| `HealthCredentialVerifier` | `HealthCredentialVerifier.sol` | Atomic ZK proof verification + credential logging |
| `Halo2VerifierReusable` | `EZKLVerifierReusable.sol` | EZKL-generated Halo2 proof verifier (deployed separately) |

`HealthCredentialVerifier` calls `Halo2VerifierReusable.verifyProof` internally and only emits `HealthCredentialVerified` after the proof passes.

## Prerequisites

1. Set your deployer private key in `.env`:
   ```
   DEPLOYER_PRIVATE_KEY=0x...
   ```

2. Get SKALE Europa testnet sFUEL from the faucet at https://portal.skale.space/faucet

## Deploy (standalone scripts, no Hardhat required)

### 1. Deploy Halo2VerifierReusable (one-time)

```bash
node scripts/deploy-reusable-verifier.mjs
```

### 2. Register the verification key

```bash
node scripts/register-vk-on-chain.mjs
```

### 3. Deploy HealthCredentialVerifier

Requires the Halo2 verifier address and a registered VK digest:

```bash
node scripts/deploy-standalone.mjs
# or with explicit VK digest:
node scripts/deploy-standalone.mjs --vk-digest 0x...
```

After deployment, add to `.env`:
```
NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
```

Then restart `bun dev`.
