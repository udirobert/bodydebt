import { createConfig, http, injected } from "wagmi";
import { skaleEuropaTestnet } from "viem/chains";

export const skaleChain = skaleEuropaTestnet;

export const wagmiConfig = createConfig({
  chains: [skaleChain],
  connectors: [injected()],
  transports: {
    [skaleChain.id]: http(),
  },
});
