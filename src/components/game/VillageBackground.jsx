import React from "react";
import { VILLAGES } from "@/lib/gameData";

export default function VillageBackground({ villageKey, children }) {
  const imgUrl = VILLAGES[villageKey]?.bgImage || VILLAGES.paris.bgImage;

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${imgUrl})` }}
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
