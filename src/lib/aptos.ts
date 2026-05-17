import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { APTOS_NODE_URL } from "./constants";

let aptosInstance: Aptos | null = null;

export function getAptosClient(): Aptos {
  if (aptosInstance) return aptosInstance;

  const network = process.env.NEXT_PUBLIC_SHELBY_NETWORK ?? "testnet";

  if (network === "testnet") {
    aptosInstance = new Aptos(
      new AptosConfig({
        network: Network.TESTNET,
      })
    );
  } else {
    // Shelbynet uses a custom fullnode instead of the standard Aptos network presets.
    aptosInstance = new Aptos(
      new AptosConfig({
        network: Network.CUSTOM,
        fullnode: APTOS_NODE_URL,
      })
    );
  }

  return aptosInstance;
}
