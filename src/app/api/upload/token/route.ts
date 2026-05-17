import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest } from "next/server";

// Generates a client-side upload token for Vercel Blob.
// The browser calls this first, then uploads the video directly to Blob
// (bypassing the 4.5 MB function body limit) using the returned token.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
        "video/webm",
        "video/*",
      ],
      maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      addRandomSuffix: true,
    }),
  });

  return Response.json(jsonResponse);
}
