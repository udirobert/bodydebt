import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { skaleEuropaTestnet } from 'viem/chains';

// SKALE Europa Testnet configuration
export const skaleEuropa = {
  ...skaleEuropaTestnet,
  name: 'SKALE Europa Testnet',
  rpcUrls: {
    default: { http: ['https://testnet.skalenodes.com/v1/elated-tan-skat'] },
    public: { http: ['https://testnet.skalenodes.com/v1/elated-tan-skat'] },
  },
};

// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: skaleEuropa,
  transport: http(),
});

// Wallet client for signing transactions (to be connected via Wagmi in the UI)
export function createWalletClientWithSigner(signer: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }) {
  return createWalletClient({
    chain: skaleEuropa,
    transport: custom(signer),
  });
}

// ABI for the HealthCredentialVerifier contract
export const healthCredentialVerifierABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'modelId', type: 'string' },
      { indexed: false, internalType: 'bool', name: 'isHealthy', type: 'bool' },
      { indexed: false, internalType: 'string', name: 'proofReference', type: 'string' },
    ],
    name: 'HealthCredentialVerified',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'string', name: 'modelId', type: 'string' },
      { internalType: 'bool', name: 'isHealthy', type: 'bool' },
      { internalType: 'bytes32', name: 'proofHash', type: 'bytes32' },
      { internalType: 'string', name: 'proofReference', type: 'string' },
    ],
    name: 'verifyAndLogCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'verifiedProofs',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Placeholder for the deployed contract address (update after deployment)
export const VERIFIER_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';
