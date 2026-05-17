"use client";

import { useQuery } from "@tanstack/react-query";
import type { VideoMetadata } from "@/types";

async function fetchAllVideos(): Promise<VideoMetadata[]> {
  const res = await fetch("/api/videos", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function fetchAccountVideos(address: string): Promise<VideoMetadata[]> {
  const res = await fetch(`/api/videos?creator=${encodeURIComponent(address)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: fetchAllVideos,
    staleTime: 60 * 1000,
  });
}

export function useAccountVideos(address: string | undefined) {
  return useQuery({
    queryKey: ["videos", address],
    queryFn: () => fetchAccountVideos(address!),
    enabled: !!address,
    staleTime: 30 * 1000,
  });
}
