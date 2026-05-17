"use client";

import { useVideos } from "@/hooks/useVideos";
import VideoGrid from "@/components/video/VideoGrid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type SortKey = "recent" | "trending";

export default function HomeFeed() {
  const { data: videos = [], isLoading } = useVideos();
  const [sort, setSort] = useState<SortKey>("recent");
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  const filtered = useMemo(() => {
    let list = [...videos];

    // Search filter
    if (query) {
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.description?.toLowerCase().includes(query) ||
          v.creator.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sort === "recent") {
      list.sort((a, b) => b.uploadedAt - a.uploadedAt);
    } else {
      // trending: sort by view count if available, else recent
      list.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    }

    return list;
  }, [videos, sort, query]);

  return (
    <div id="feed">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {query ? `Results for "${query}"` : "Videos"}
          </h2>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} video{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <TabsList className="bg-surface border border-border">
            <TabsTrigger
              value="recent"
              className="text-xs data-[state=active]:bg-brand-muted data-[state=active]:text-primary"
            >
              Recent
            </TabsTrigger>
            <TabsTrigger
              value="trending"
              className="text-xs data-[state=active]:bg-brand-muted data-[state=active]:text-primary"
            >
              Trending
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <VideoGrid
        videos={filtered}
        loading={isLoading}
        emptyMessage={
          query
            ? `No videos found for "${query}"`
            : "No videos yet. Be the first to upload!"
        }
      />
    </div>
  );
}
