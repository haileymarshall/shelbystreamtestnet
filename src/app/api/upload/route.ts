import { NextRequest } from "next/server";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join, extname } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { del, get } from "@vercel/blob";
import ffmpegStatic from "ffmpeg-static";

export const maxDuration = 300; // 5 minutes

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryReadPublicBlob(url: string): Promise<Buffer | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

async function tryReadBlobByPath(pathname: string): Promise<Buffer | null> {
  const blobResult = await get(pathname, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    useCache: false,
  });

  if (!blobResult || blobResult.statusCode !== 200) {
    return null;
  }

  const bytes = await new Response(blobResult.stream).arrayBuffer();
  return Buffer.from(bytes);
}

async function downloadUploadedBlob({
  blobPath,
  blobUrl,
  blobDownloadUrl,
}: {
  blobPath?: string;
  blobUrl: string;
  blobDownloadUrl?: string;
}): Promise<Buffer> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const delayMs = attempt * 750;
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const readers = [
      async () => (blobDownloadUrl ? tryReadPublicBlob(blobDownloadUrl) : null),
      async () => tryReadPublicBlob(blobUrl),
      async () => (blobPath ? tryReadBlobByPath(blobPath) : null),
    ];

    for (const reader of readers) {
      try {
        const result = await reader();
        if (result) {
          return result;
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Failed to download video from blob after multiple attempts");
}

async function resolveFfmpegBinary(): Promise<string | null> {
  const { existsSync, chmodSync } = await import("fs");

  const candidates = [
    ffmpegStatic,
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (process.platform !== "win32") chmodSync(candidate, 0o755);
    return candidate;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const videoId = randomUUID();
  const workDir = join(tmpdir(), `shelby-${videoId}`);

  const {
    blobPath,
    blobUrl,
    blobDownloadUrl,
    filename,
    title,
    description,
    tags,
    creatorAddress,
  } =
    (await req.json()) as {
      blobPath?: string;
      blobUrl: string;
      blobDownloadUrl?: string;
      filename?: string;
      title: string;
      description: string;
      tags: string;
      creatorAddress: string;
    };

  if (!blobUrl || !creatorAddress) {
    return new Response(
      JSON.stringify({ error: "Missing blob URL or creator address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const ext =
    (extname(filename ?? "") || extname(new URL(blobUrl).pathname) || ".mp4").toLowerCase();
  const videoFileName = `video${ext}`;
  const videoBlobPath = `videos/${videoId}/${videoFileName}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(
        stage: string,
        message: string,
        extra: { videoId?: string; creatorAddress?: string } = {}
      ) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ stage, message, ...extra })}\n\n`
          )
        );
      }

      try {
        send("transcoding", "Downloading video from storage...");

        await mkdir(workDir, { recursive: true });
        const inputPath = join(workDir, `input${ext}`);

        const videoBuffer = await downloadUploadedBlob({
          blobPath,
          blobUrl,
          blobDownloadUrl,
        });
        await writeFile(inputPath, videoBuffer);

        send("encoding", "Extracting thumbnail...");

        let thumbnailBuffer: Buffer | null = null;
        try {
          const ffmpegBin = await resolveFfmpegBinary();
          if (ffmpegBin) {
            const { spawn } = await import("child_process");
            const thumbnailPath = join(workDir, "thumbnail.jpg");
            await new Promise<void>((resolve, reject) => {
              const proc = spawn(
                ffmpegBin,
                [
                  "-y",
                  "-i",
                  inputPath,
                  "-ss",
                  "1",
                  "-vframes",
                  "1",
                  "-q:v",
                  "2",
                  thumbnailPath,
                ],
                { stdio: "ignore" }
              );
              proc.on("error", reject);
              proc.on("close", (code) =>
                code === 0
                  ? resolve()
                  : reject(new Error(`ffmpeg exited with code ${code}`))
              );
            });
            thumbnailBuffer = await readFile(thumbnailPath);
          } else {
            console.warn("ffmpeg binary not found, continuing without thumbnail");
          }
        } catch (err) {
          console.error("Thumbnail extraction failed, continuing without:", err);
        }

        const privateKey = process.env.APTOS_PRIVATE_KEY;
        if (!privateKey) throw new Error("APTOS_PRIVATE_KEY not configured");

        const { getShelbyNodeClient } = await import("@/lib/shelby-server");
        const { client, account } = await getShelbyNodeClient(privateKey);
        const expirationMicros = (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000;

        send("uploading", "Uploading video to Shelby...");

        // Shelby testnet accepts single-blob uploads reliably here, while
        // batchUpload can hang on media writes. Upload the media assets
        // sequentially so the route matches the verified testnet behavior.
        await client.upload({
          blobData: videoBuffer,
          signer: account,
          blobName: videoBlobPath,
          expirationMicros,
        });

        if (thumbnailBuffer) {
          await client.upload({
            blobData: thumbnailBuffer,
            signer: account,
            blobName: `videos/${videoId}/thumbnail.jpg`,
            expirationMicros,
          });
        }

        send("registering", "Registering metadata on Shelby...");

        const metadataBlob = {
          title: title ?? "Untitled",
          description: description ?? "",
          tags: (tags ?? "")
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
          creator: creatorAddress,
          uploadedAt: Math.floor(Date.now() / 1000),
          duration: 0,
          qualities: ["original"],
          thumbnailBlob: thumbnailBuffer
            ? `videos/${videoId}/thumbnail.jpg`
            : "",
          blobName: videoBlobPath,
        };

        const metadataBuffer = Buffer.from(JSON.stringify(metadataBlob));
        await client.upload({
          blobData: metadataBuffer,
          signer: account,
          blobName: `videos/${videoId}/metadata.json`,
          expirationMicros,
        });

        send("done", "Upload complete!", {
          videoId,
          creatorAddress: account.accountAddress.toString(),
        });
      } catch (err) {
        console.error("Upload error:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        send("error", message);
      } finally {
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
        await del(blobPath ?? blobUrl).catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
