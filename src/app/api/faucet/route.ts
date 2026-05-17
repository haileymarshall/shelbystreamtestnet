import { NextRequest } from "next/server";
import { SHELBY_NETWORK } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { address, token } = await req.json();

    if (!address || !token) {
      return Response.json(
        { error: "Missing address or token type" },
        { status: 400 }
      );
    }

    if (token !== "APT" && token !== "ShelbyUSD") {
      return Response.json(
        { error: "Invalid token type. Must be APT or ShelbyUSD" },
        { status: 400 }
      );
    }

    if (SHELBY_NETWORK === "testnet") {
      return Response.json(
        {
          error:
            "Shelby testnet faucet access is gated. Use the Shelby Discord /faucet command for Early Access testnet funds.",
        },
        { status: 501 }
      );
    }

    const privateKey = process.env.APTOS_PRIVATE_KEY;
    if (!privateKey) throw new Error("APTOS_PRIVATE_KEY not configured");

    const { getShelbyNodeClient } = await import("@/lib/shelby-server");
    const { client } = await getShelbyNodeClient(privateKey);

    if (token === "APT") {
      const hash = await client.fundAccountWithAPT({
        address,
        amount: 100_000_000, // 1 APT
      });
      return Response.json({ hash, amount: "1 APT" });
    } else {
      return Response.json(
        {
          error:
            "ShelbyUSD faucet automation is only available on Shelbynet. Use the gated Shelby Discord /faucet flow for testnet.",
        },
        { status: 501 }
      );
    }
  } catch (err) {
    console.error("Faucet error:", err);
    const message = err instanceof Error ? err.message : "Faucet request failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
