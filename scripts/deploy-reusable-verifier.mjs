#!/usr/bin/env node

/**
 * Deploy the EZKL-generated Halo2VerifierReusable to SKALE Europa testnet.
 * The reusable verifier is simpler than the standard one — VK is passed as
 * calldata rather than embedded in the contract, making it deployable on EVM.
 *
 * Usage: node scripts/deploy-reusable-verifier.mjs
 * Requires: DEPLOYER_PRIVATE_KEY in .env or environment
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set");
    process.exit(1);
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(
    "https://testnet.skalenodes.com/v1/juicy-low-small-testnet"
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);
  console.log("Deployer:", address);
  console.log("Balance:", ethers.formatEther(balance), "sFUEL");

  // Read reusable verifier source
  const contractPath = resolve(__dirname, "..", "contracts", "EZKLVerifierReusable.sol");
  const source = readFileSync(contractPath, "utf8");

  // Install solc if needed
  let solc;
  try {
    solc = require("solc");
  } catch {
    console.log("Installing solc...");
    const { execSync } = await import("child_process");
    execSync("npm install solc@0.8.28", { cwd: resolve(__dirname, ".."), stdio: "pipe" });
    solc = require("solc");
  }

  console.log("Compiling EZKLVerifierReusable.sol (Halo2VerifierReusable)...");
  const input = {
    language: "Solidity",
    sources: {
      "EZKLVerifierReusable.sol": { content: source },
    },
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts["EZKLVerifierReusable.sol"]["Halo2VerifierReusable"];
  if (!contract) {
    console.error("Compilation failed:", JSON.stringify(output.errors, null, 2));
    process.exit(1);
  }

  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Bytecode length:", Math.round(bytecode.length / 2 / 1024), "KB");
  console.log("Deploying Halo2VerifierReusable to SKALE Europa Testnet...");
  console.log("(This may take 1-2 minutes...)");

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const verifier = await factory.deploy();
  await verifier.waitForDeployment();

  const deployedAddress = await verifier.getAddress();
  const txHash = verifier.deploymentTransaction()?.hash ?? "";

  console.log("\n✅ Halo2VerifierReusable deployed to:", deployedAddress);
  console.log("Tx hash:", txHash);

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log("Gas used:", receipt?.gasUsed?.toString() ?? "unknown");
  } catch {
    console.log("Gas used: (could not fetch receipt)");
  }

  // Save config for easy import
  const configPath = resolve(__dirname, "..", "public", "ezkl-verifier-config.json");
  writeFileSync(configPath, JSON.stringify({
    address: deployedAddress,
    txHash,
    network: "skale-europa-testnet",
    chainId: 1444673419,
    deployedAt: new Date().toISOString(),
  }, null, 2));
  console.log("\nSaved config to public/ezkl-verifier-config.json");

  // Print env var for .env
  console.log("\nAdd to your .env:");
  console.log(`NEXT_PUBLIC_EZKL_VERIFIER_ADDRESS=${deployedAddress}`);

  console.log("\nView on explorer:");
  console.log(`https://juicy-low-small-testnet.explorer.skalenodes.com/address/${deployedAddress}`);

  // Print the ABI for import
  const abiPath = resolve(__dirname, "..", "public", "ezkl-verifier-abi.json");
  writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("Saved ABI to public/ezkl-verifier-abi.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
