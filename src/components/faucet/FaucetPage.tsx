"use client";

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Droplets,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  Fuel,
} from "lucide-react";
import { toast } from "sonner";
import { SHELBY_NETWORK } from "@/lib/constants";

export default function FaucetPage() {
  const { connected, account } = useWallet();
  const [loadingApt, setLoadingApt] = useState(false);
  const [loadingSusd, setLoadingSusd] = useState(false);
  const [lastTx, setLastTx] = useState<{
    token: string;
    hash: string;
    amount: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isTestnet = SHELBY_NETWORK === "testnet";

  const requestTokens = async (token: "APT" | "ShelbyUSD") => {
    if (!account?.address) return;

    const setLoading = token === "APT" ? setLoadingApt : setLoadingSusd;
    setLoading(true);
    setError(null);
    setLastTx(null);

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address.toString(),
          token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Faucet request failed");
      }

      setLastTx({ token, hash: data.hash, amount: data.amount });
      toast.success(`Received ${data.amount}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-brand mx-auto flex items-center justify-center mb-6 glow-brand">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect your wallet</h2>
        <p className="text-muted-foreground">
          Connect your Petra wallet to request test tokens.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Faucet</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {isTestnet
            ? "Shelby testnet faucet access is gated. Use the Shelby Discord /faucet command for Early Access testnet funds."
            : "Request test tokens on Shelbynet. APT is used for gas fees, ShelbyUSD is used for storage fees when uploading videos."}
        </p>
      </div>

      <div className="space-y-4">
        {/* APT Faucet */}
        <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">APT (Gas Token)</h3>
                <p className="text-xs text-muted-foreground">
                  Used for transaction gas fees on Aptos
                </p>
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              1 APT per request
            </span>
          </div>
          <Button
            onClick={() => requestTokens("APT")}
            disabled={loadingApt || isTestnet}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isTestnet ? (
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Use Discord /faucet
              </span>
            ) : loadingApt ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting APT...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Request 1 APT
              </span>
            )}
          </Button>
        </div>

        {/* ShelbyUSD Faucet */}
        <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">ShelbyUSD (Storage Token)</h3>
                <p className="text-xs text-muted-foreground">
                  Used to pay for blob storage on the Shelby network
                </p>
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              1 SUSD per request
            </span>
          </div>
          <Button
            onClick={() => requestTokens("ShelbyUSD")}
            disabled={loadingSusd || isTestnet}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white"
          >
            {isTestnet ? (
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Use Discord /faucet
              </span>
            ) : loadingSusd ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting ShelbyUSD...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Request 1 ShelbyUSD
              </span>
            )}
          </Button>
        </div>

        {/* Success */}
        {lastTx && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <AlertDescription>
              Received <strong>{lastTx.amount}</strong>! Transaction:{" "}
              <code className="text-xs font-mono">
                {lastTx.hash.slice(0, 16)}...
              </code>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="p-4 rounded-xl bg-brand-muted/30 border border-primary/10">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Connected wallet:</strong>{" "}
            <code className="font-mono text-xs">
              {account?.address?.toString().slice(0, 10)}...
              {account?.address?.toString().slice(-8)}
            </code>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {isTestnet ? (
              <>
                Early Access testnet funds are issued through Shelby&apos;s gated
                Discord faucet flow. After funding your wallet, you can{" "}
                <a href="/upload" className="text-primary hover:underline">
                  upload a video
                </a>
                .
              </>
            ) : (
              <>
                These are test tokens on Shelbynet and have no real value. After
                receiving tokens, you can{" "}
                <a href="/upload" className="text-primary hover:underline">
                  upload a video
                </a>{" "}
                which requires both APT (gas) and ShelbyUSD (storage fee).
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
