import type { VideoMetadata } from "@/types";
import { SHELBY_RPC_ENDPOINT } from "@/lib/constants";

interface ShelbyBlobMetadata {
  owner: string;
  blobNameSuffix: string;
  creationMicros: number;
}

function normalizeCreator(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  return fallback;
}

async function fetchVideoMetadata(blob: ShelbyBlobMetadata): Promise<VideoMetadata | null> {
  if (!/^videos\/[^/]+\/metadata\.json$/.test(blob.blobNameSuffix)) {
    return null;
  }

  const metaRes = await fetch(
    `${SHELBY_RPC_ENDPOINT}/v1/blobs/${blob.owner}/${blob.blobNameSuffix}`,
    { cache: "no-store" }
  );

  if (!metaRes.ok) return null;

  const meta = (await metaRes.json()) as Partial<VideoMetadata>;
  const parts = blob.blobNameSuffix.split("/");
  const videoId = parts[1];

  return {
    id: videoId,
    title: meta.title ?? "Untitled",
    description: meta.description ?? "",
    creator: normalizeCreator(meta.creator, blob.owner),
    duration: meta.duration ?? 0,
    uploadedAt: meta.uploadedAt ?? Math.floor(blob.creationMicros / 1_000_000),
    qualities: meta.qualities ?? ["original"],
    thumbnailBlob: meta.thumbnailBlob ?? "",
    blobName: meta.blobName ?? blob.blobNameSuffix.replace(/\/metadata\.json$/, "/video.mp4"),
    tags: meta.tags ?? [],
    viewCount: meta.viewCount,
  };
}

export async function GET(req: Request) {
  try {
    const privateKey = process.env.APTOS_PRIVATE_KEY;
    if (!privateKey) {
      return Response.json(
        { error: "APTOS_PRIVATE_KEY not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const creator = searchParams.get("creator")?.toLowerCase();

    const { getShelbyNodeClient } = await import("@/lib/shelby-server");
    const { client } = await getShelbyNodeClient(privateKey);

    const blobs = await client.coordination.getBlobs({
      where: {
        blob_name: { _like: "%/metadata.json" },
      },
      orderBy: { created_at: "desc" },
      pagination: { limit: 100 },
    });

    const videos = (
      await Promise.all(
        blobs.map((blob) =>
          fetchVideoMetadata({
            owner: blob.owner,
            blobNameSuffix: blob.blobNameSuffix,
            creationMicros: blob.creationMicros,
          })
        )
      )
    ).filter((video): video is VideoMetadata => video !== null);

    const filteredVideos = creator
      ? videos.filter(
          (video) =>
            typeof video.creator === "string" &&
            video.creator.toLowerCase() === creator
        )
      : videos;

    return Response.json(filteredVideos);
  } catch (error) {
    console.error("Videos route error:", error);
    return Response.json([], { status: 200 });
  }
}
