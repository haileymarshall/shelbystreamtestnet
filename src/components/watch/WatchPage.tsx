"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, ExternalLink, Clock, Shield } from "lucide-react";
import type { VideoMetadata } from "@/types";
import { formatDuration, formatTimeAgo, shortenAddress } from "@/lib/metadata";
import { SHELBY_NETWORK, SHELBY_RPC_ENDPOINT } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";
import ShelbyPlayer from "./ShelbyPlayer";

interface WatchPageProps {
  address: string;
  videoId: string;
}

export default function WatchPage({ address, videoId }: WatchPageProps) {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const videoUrl = metadata?.blobName
    ? `${SHELBY_RPC_ENDPOINT}/v1/blobs/${address}/${metadata.blobName}`
    : null;
  const thumbnailUrl = metadata?.thumbnailBlob
    ? `${SHELBY_RPC_ENDPOINT}/v1/blobs/${address}/${metadata.thumbnailBlob}`
    : undefined;

  useEffect(() => {
    async function load() {
      try {
        const url = `${SHELBY_RPC_ENDPOINT}/v1/blobs/${address}/videos/${videoId}/metadata.json`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMetadata({ ...data, id: videoId, creator: address });
        }
      } catch {
        // metadata fetch failed — video still plays
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address, videoId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Player */}
          <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
            {videoUrl ? (
              <ShelbyPlayer
                src={videoUrl}
                poster={thumbnailUrl}
                title={metadata?.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                {loading ? "Loading video…" : "Video not found"}
              </div>
            )}
          </div>

          {/* Video info */}
          {loading ? (
            <VideoInfoSkeleton />
          ) : (
            <div className="space-y-3">
              <h1 className="text-xl font-bold leading-snug">
                {metadata?.title ?? "Untitled Video"}
              </h1>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Link href={`/channel/${address}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="gradient-brand text-white text-xs">
                        {address.slice(2, 4).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link
                      href={`/channel/${address}`}
                      className="text-sm font-medium hover:text-primary transition-colors font-mono"
                    >
                      {shortenAddress(address)}
                    </Link>
                    {metadata?.uploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(metadata.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShare}
                    className="h-8 border-border hover:border-primary/40 hover:bg-brand-muted hover:text-primary"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Description */}
              {metadata?.description && (
                <div className="bg-surface rounded-lg p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {metadata.description}
                  </p>
                  {metadata.tags && metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {metadata.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-brand-muted text-primary border-primary/20"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* On-chain info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4 text-primary" />
              On-Chain Provenance
            </div>
            <Separator className="bg-border" />

            <div className="space-y-2.5">
              <InfoRow label="Network" value="Shelby Protocol" />
              <InfoRow label="Chain" value="Aptos" />
              <InfoRow
                label="Creator"
                value={
                  <span className="font-mono text-xs">
                    {shortenAddress(address)}
                  </span>
                }
              />
              {metadata?.qualities && (
                <InfoRow
                  label="Quality"
                  value={
                    <div className="flex gap-1">
                      {metadata.qualities.map((q) => (
                        <Badge
                          key={q}
                          variant="secondary"
                          className="text-xs px-1.5 py-0 bg-brand-muted text-primary border-primary/20"
                        >
                          {q}
                        </Badge>
                      ))}
                    </div>
                  }
                />
              )}
              {(metadata?.duration ?? 0) > 0 && (
                <InfoRow
                  label="Duration"
                  value={
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(metadata?.duration ?? 0)}
                    </span>
                  }
                />
              )}
            </div>

            <Separator className="bg-border" />

            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={`https://explorer.aptoslabs.com/account/${address}?network=${SHELBY_NETWORK === "testnet" ? "testnet" : "custom"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full h-8 text-xs border-border hover:border-primary/40 hover:bg-brand-muted hover:text-primary"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View on Explorer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">
        {value}
      </span>
    </div>
  );
}

function VideoInfoSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4 bg-surface" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full bg-surface" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32 bg-surface" />
          <Skeleton className="h-3 w-20 bg-surface" />
        </div>
      </div>
    </div>
  );
}
