import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { videoId, creatorAddress } = await req.json();

    if (!videoId || !creatorAddress) {
      return Response.json(
        { error: "Missing videoId or creatorAddress" },
        { status: 400 }
      );
    }

    const privateKey = process.env.APTOS_PRIVATE_KEY;
    if (!privateKey) throw new Error("APTOS_PRIVATE_KEY not configured");

    const { getShelbyNodeClient } = await import("@/lib/shelby-server");
    const { client, account } = await getShelbyNodeClient(privateKey);

    // Verify the video belongs to this creator by checking metadata
    const { SHELBY_RPC_ENDPOINT } = await import("@/lib/constants");
    const ownerAddress = account.accountAddress.toString();
    const metaUrl = `${SHELBY_RPC_ENDPOINT}/v1/blobs/${ownerAddress}/videos/${videoId}/metadata.json`;
    const metaRes = await fetch(metaUrl, { cache: "no-store" });

    if (!metaRes.ok) {
      return Response.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const meta = await metaRes.json();
    if (meta.creator?.toLowerCase() !== creatorAddress.toLowerCase()) {
      return Response.json(
        { error: "You can only delete your own videos" },
        { status: 403 }
      );
    }

    // Ask the Shelby SDK for active blobs instead of hitting a network-specific indexer URL.
    const existingBlobs = await client.coordination.getBlobs({
      where: {
        owner: { _eq: ownerAddress },
        blob_name: { _like: `%/videos/${videoId}/%` },
      },
      pagination: { limit: 500 },
    });

    const blobNames = existingBlobs.map((blob) => blob.blobNameSuffix);

    // Fallback: if indexer returned nothing, delete known paths
    if (blobNames.length === 0) {
      blobNames.push(
        `videos/${videoId}/metadata.json`,
        `videos/${videoId}/master.m3u8`,
        `videos/${videoId}/thumbnail.jpg`
      );
    }

    // Delete blobs — use deleteMultipleBlobs if available, else one by one
    let deletedCount = 0;
    try {
      await client.coordination.deleteMultipleBlobs({
        account,
        blobNames,
      });
      deletedCount = blobNames.length;
    } catch {
      // Fallback: delete one at a time
      for (const blobName of blobNames) {
        try {
          await client.coordination.deleteBlob({
            account,
            blobName,
          });
          deletedCount++;
        } catch (e) {
          console.warn(`Failed to delete blob ${blobName}:`, e);
        }
      }
    }

    return Response.json({
      success: true,
      deletedCount,
      videoId,
    });
  } catch (err) {
    console.error("Delete error:", err);
    const message = err instanceof Error ? err.message : "Delete failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
