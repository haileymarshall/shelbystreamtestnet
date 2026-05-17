"use client";

import "@shelby-protocol/player/styles/shadcn.css";

import {
  PlayerProvider,
  PlayerContainer,
  PlayButton,
  PlayGestureRegion,
  MuteButton,
  PipButton,
  FullscreenButton,
  ShakaVideo,
  Seekbar,
  VolumeSlider,
  CurrentTimeDisplay,
  MediaTitle,
  RenditionsSubMenuButton,
  PlaybackRateSubMenu,
  SettingsMenuTriggerButton,
  DropdownMenu,
  DropdownMenuContent,
  useFullscreenContainer,
} from "@shelby-protocol/player";
import { MediaProvider, useMediaSelector } from "media-chrome/react/media-store";
import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShelbyPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

function PlayerControls({ title }: { title?: string }) {
  const fullscreenContainer = useFullscreenContainer();
  const mediaIsFullscreen = useMediaSelector(
    (state: { mediaIsFullscreen?: boolean }) => !!state.mediaIsFullscreen
  );
  const mediaPaused = useMediaSelector(
    (state: { mediaPaused?: boolean }) =>
      typeof state.mediaPaused !== "boolean" || state.mediaPaused
  );

  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisible = mediaPaused || visible;

  const showControls = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!mediaPaused) {
      timeoutRef.current = setTimeout(() => setVisible(false), 2500);
    }
  }, [mediaPaused]);

  useEffect(() => {
    if (mediaPaused) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [mediaPaused]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      onMouseMove={showControls}
      className="absolute inset-0 flex flex-col z-50"
    >
      {/* Click-to-play region fills available space */}
      <div className="flex-1 relative">
        <PlayGestureRegion className="absolute inset-0" />
        {mediaPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom gradient backdrop */}
      <div
        className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0 }}
      />

      {/* Seekbar */}
      <div
        className="flex w-full items-center px-4 z-20 transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
      >
        <Seekbar />
      </div>

      {/* Control bar */}
      <div
        className="flex w-full items-center pb-1 px-2 z-20 transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
      >
        <PlayButton />
        <MuteButton />
        <VolumeSlider />
        <MediaTitle title={title} />
        <div className="flex-1" />
        <CurrentTimeDisplay />
        <PipButton />
        <DropdownMenu>
          <SettingsMenuTriggerButton />
          <DropdownMenuContent
            className="sp-default-layout-dropdown-menu-content bg-sp-popover text-sp-popover-foreground shadow-sm p-2 min-w-64 z-50"
            side="top"
            align="end"
            container={mediaIsFullscreen ? fullscreenContainer?.current : undefined}
          >
            <RenditionsSubMenuButton />
            <PlaybackRateSubMenu />
          </DropdownMenuContent>
        </DropdownMenu>
        <FullscreenButton />
      </div>
    </div>
  );
}

export default function ShelbyPlayer({ src, poster, title }: ShelbyPlayerProps) {
  return (
    <div className="w-full h-full">
      <MediaProvider>
        <PlayerProvider>
          <PlayerContainer>
            <ShakaVideo src={src} poster={poster} className="w-full h-full" />
            <PlayerControls title={title} />
          </PlayerContainer>
        </PlayerProvider>
      </MediaProvider>
    </div>
  );
}
