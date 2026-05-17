"use client";

import { Network } from "@aptos-labs/ts-sdk";

export function getShelbyNetwork(): Network.SHELBYNET | Network.TESTNET {
  const net = process.env.NEXT_PUBLIC_SHELBY_NETWORK ?? "testnet";
  if (net === "testnet") return Network.TESTNET;
  return Network.SHELBYNET;
}

export async function getShelbyClient() {
  throw new Error("Direct browser Shelby clients are disabled. Use server routes instead.");
}

export async function getShelbyNodeClient(privateKey: string) {
  const { ShelbyNodeClient } = await import("@shelby-protocol/sdk/node");
  const { Ed25519PrivateKey, PrivateKey, PrivateKeyVariants, Account } =
    await import("@aptos-labs/ts-sdk");

  const network = getShelbyNetwork();

  const client = new ShelbyNodeClient({
    network,
    apiKey: process.env.SHELBY_API_KEY ?? "",
  });

  const formattedKey = PrivateKey.formatPrivateKey(
    privateKey,
    PrivateKeyVariants.Ed25519
  );
  const ed25519Key = new Ed25519PrivateKey(formattedKey);
  const account = Account.fromPrivateKey({ privateKey: ed25519Key });

  return { client, account };
}
