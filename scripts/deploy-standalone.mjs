#!/usr/bin/env node

/**
 * Standalone deployment script for HealthCredentialVerifier.
 * Uses solc + ethers directly — no hardhat dependency.
 *
 * Usage: node scripts/deploy-standalone.mjs
 * Requires: DEPLOYER_PRIVATE_KEY in .env or environment
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function main() {
  // Load env
  const envPath = resolve(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in .env or environment");
    process.exit(1);
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(
    "https://testnet.skalenodes.com/v1/juicy-low-small-testnet"
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();
  console.log("Deployer address:", address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(address)), "sFUEL");

  // Read contract source
  const contractPath = resolve(__dirname, "..", "contracts", "HealthCredentialVerifier.sol");
  const source = readFileSync(contractPath, "utf8");

  // Compile using solc
  let solc;
  try {
    solc = require("solc");
  } catch {
    // Install solc on the fly
    console.log("solc not found, installing...");
    const { execSync } = await import("child_process");
    execSync("npm install solc@0.8.20", { cwd: resolve(__dirname, ".."), stdio: "pipe" });
    solc = require("solc");
  }

  console.log("Compiling HealthCredentialVerifier.sol...");
  const input = {
    language: "Solidity",
    sources: {
      "HealthCredentialVerifier.sol": { content: source },
    },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["HealthCredentialVerifier.sol"]["HealthCredentialVerifier"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Deploying to SKALE Europa Testnet...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const verifier = await factory.deploy();
  await verifier.waitForDeployment();

  const deployedAddress = await verifier.getAddress();
  console.log("\n✅ Deployed to:", deployedAddress);
  console.log("\nAdd to your .env:");
  console.log(`NEXT_PUBLIC_VERIFIER_ADDRESS=${deployedAddress}`);

  // Verify on SKALE explorer
  console.log("\nView on explorer:");
  console.log(`https://juicy-low-small-testnet.explorer.skalenodes.com/address/${deployedAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
