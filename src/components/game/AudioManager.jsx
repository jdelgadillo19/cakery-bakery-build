import React, { useState } from "react";
import { Volume2, VolumeX, Music, Music2 } from "lucide-react";
import { setMusicEnabled, setSFXEnabled, isMusicEnabled, isSFXEnabled } from "@/lib/audio";

export default function AudioManager() {
  const [music, setMusic] = useState(isMusicEnabled());
  const [sfx, setSFX] = useState(isSFXEnabled());

  const toggleMusic = () => {
    const next = !music;
    setMusic(next);
    setMusicEnabled(next);
  };

  const toggleSFX = () => {
    const next = !sfx;
    setSFX(next);
    setSFXEnabled(next);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleMusic}
        title={music ? "Mute Music" : "Unmute Music"}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/20"
      >
        {music ? (
          <Music className="w-3.5 h-3.5 text-white/80" />
        ) : (
          <Music2 className="w-3.5 h-3.5 text-white/40" />
        )}
      </button>
      <button
        onClick={toggleSFX}
        title={sfx ? "Mute SFX" : "Unmute SFX"}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/20"
      >
        {sfx ? (
          <Volume2 className="w-3.5 h-3.5 text-white/80" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 text-white/40" />
        )}
      </button>
    </div>
  );
}