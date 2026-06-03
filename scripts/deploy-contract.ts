import { ethers } from "hardhat";

async function main() {
  console.log("Deploying HealthCredentialVerifier to SKALE Europa Testnet...");

  const Verifier = await ethers.getContractFactory("HealthCredentialVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const address = await verifier.getAddress();
  console.log("Deployed to:", address);
  console.log("");
  console.log("Add to your .env:");
  console.log(`NEXT_PUBLIC_VERIFIER_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
