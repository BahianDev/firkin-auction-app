"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useState } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import {
  bitgetWallet,
  metaMaskWallet,
  phantomWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { Toaster } from "react-hot-toast";
import { base, mainnet } from "viem/chains";

// Defina sua chain personalizada
const myCustomChain = {
  id: 8453,
  name: "Base Custom",
  network: "base",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  contracts: {
    ensUniversalResolver: {
      address: "0xaBd80E8a13596fEeA40Fd26fD6a24c3fe76F05fB" as `0x${string}`,
    },
  },
  rpcUrls: {
    default: {
      http: [
        "https://base-mainnet.g.alchemy.com/v2/a-m50qa9KvJSTtd21VcN_4Jp-rTe1yHg",
      ],
    },
    public: {
      http: [
        "https://base-mainnet.g.alchemy.com/v2/a-m50qa9KvJSTtd21VcN_4Jp-rTe1yHg",
      ],
    },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://basescan.org" },
  },
};

export const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: [myCustomChain], // Use sua chain personalizada aqui
  wallets: [
    {
      groupName: "Recommended",
      wallets: [bitgetWallet, rainbowWallet, phantomWallet, metaMaskWallet],
    },
  ],
  ssr: true,
});

export const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      {ready ? (
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <main>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      border: "1px solid #14A800",
                      color: "#000000",
                      fontWeight: "bold",
                      backgroundColor: "#FFFFFF",
                      padding: "12px",
                      fontSize: "18px",
                    },
                  }}
                />
                {children}
              </main>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      ) : null}
    </>
  );
}
