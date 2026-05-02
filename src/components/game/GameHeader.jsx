import React from "react";
import { Coins } from "lucide-react";

export default function GameHeader({ gameSave, village }) {
  if (!gameSave) return null;
  return (
    <div className="w-full bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🧁</div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-foreground">
              {gameSave.bakery_name}
            </h1>
            <p className="text-xs text-muted-foreground font-body">
              {village?.name} • {village?.era}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-1.5">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">
            {village?.currency}{(gameSave.total_coins || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}