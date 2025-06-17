"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useEffect, useState } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import {
  bitgetWallet,
  metaMaskWallet,
  phantomWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { Toaster } from "react-hot-toast";

export const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "YOUR_PROJECT_ID",
  chains: [base],
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