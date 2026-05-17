export const SHELBY_NETWORK = process.env.NEXT_PUBLIC_SHELBY_NETWORK ?? "testnet";

export const SHELBY_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SHELBY_RPC_ENDPOINT ??
  "https://api.testnet.shelby.xyz/shelby";

export const APTOS_NODE_URL =
  process.env.NEXT_PUBLIC_APTOS_NODE_URL ??
  "https://api.testnet.aptoslabs.com/v1";

export const SHELBY_INDEXER_URL =
  process.env.NEXT_PUBLIC_SHELBY_INDEXER_URL ??
  "https://api.testnet.aptoslabs.com/v1/graphql";

export const SHELBY_CONTRACT_ADDRESS =
  "0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a";

// ShelbyUSD token addresses (from @shelby-protocol/sdk constants)
export const SHELBYUSD_TOKEN_ADDRESS =
  "0x249f5c642a63885ff88a5113b3ba0079840af5a1357706f8c7f3bfc5dd12511f";
export const SHELBYUSD_FA_METADATA_ADDRESS =
  "0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1";

// Blob naming helpers
export const videoBlobPath = (address: string, videoId: string) =>
  `videos/${videoId}`;

export const masterPlaylistBlob = (videoId: string) =>
  `videos/${videoId}/master.m3u8`;

export const thumbnailBlob = (videoId: string) =>
  `videos/${videoId}/thumbnail.jpg`;

export const metadataBlob = (videoId: string) =>
  `videos/${videoId}/metadata.json`;

// TTL: 30 days in microseconds
export const DEFAULT_TTL_MICROS = BigInt(30 * 24 * 60 * 60 * 1000) * BigInt(1000);

export const getExpirationMicros = (days = 30): number =>
  (Date.now() + days * 24 * 60 * 60 * 1000) * 1000;
