# HealthCredentialVerifier — Deployment

## Prerequisites

1. Install Hardhat:
   ```bash
   bun add -d hardhat @nomicfoundation/hardhat-toolbox
   ```

2. Get SKALE Europa testnet tokens (sFUEL) from the faucet:
   - Visit https://portal.skale.space/faucet
   - Connect your wallet
   - Request testnet tokens for Europa Testnet

3. Set your deployer private key:
   ```bash
   # In .env
   DEPLOYER_PRIVATE_KEY=0x...
   ```

## Deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy-contract.ts --network skaleEuropaTestnet
```

## Update the app

After deployment, add the contract address to `.env`:
```
NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
```

Then restart `bun dev`.
