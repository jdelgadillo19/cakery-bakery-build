// SpriteMenu — Debug tool for manually managing sprite metadata & name pools
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Save, RotateCcw, Plus, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SPRITE_TITLES,
  loadSpriteConfig,
  saveSpriteConfig,
  resetSpriteConfig,
  DEFAULT_NAME_POOLS,
} from "@/lib/spriteConfig";
import { CUSTOMER_PORTRAITS, VILLAGES } from "@/lib/gameData";
import { resolveAssetUrl, resolveAssetFallback } from "@/lib/localAssets";

const VILLAGE_KEYS = ["frontier_us", "paris", "ming_china", "london"];

const NAME_GROUPS = [
  { gender: "male", ageBand: "elder", label: "♂ Elder" },
  { gender: "male", ageBand: "adult", label: "♂ Adult" },
  { gender: "male", ageBand: "child", label: "♂ Boy" },
  { gender: "female", ageBand: "elder", label: "♀ Elder" },
  { gender: "female", ageBand: "adult", label: "♀ Adult" },
  { gender: "female", ageBand: "child", label: "♀ Girl" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function NameListEditor({ title, names, onChange }) {
  const [newName, setNewName] = useState("");

  const add = () => {
    const trimmed = newName.trim();
    if (!trimmed || names.includes(trimmed)) return;
    onChange([...names, trimmed]);
    setNewName("");
  };

  const remove = (n) => onChange(names.filter((x) => x !== n));

  return (
    <div className="space-y-2">
      <p className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add name…"
          className="flex-1 text-sm font-display border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" onClick={add} className="h-8 px-3 font-display">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {names.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-display px-2 py-1 rounded-full">
            {n}
            <button type="button" onClick={() => remove(n)} className="hover:text-destructive transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {names.length === 0 && <p className="text-xs text-muted-foreground italic">No names yet.</p>}
      </div>
    </div>
  );
}

function SpriteCard({ sprite, portraitUrl, onChange }) {
  return (
    <div className="flex items-start gap-3 bg-muted/40 rounded-xl p-3 border border-border">
      <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
        {portraitUrl ? <img src={portraitUrl} alt="" className="w-full h-full object-contain" /> : <User className="w-6 h-6 text-muted-foreground" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          {["male", "female"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...sprite, gender: g })}
              className={`flex-1 text-xs font-display font-bold py-1 rounded-lg border transition-all ${
                sprite.gender === g ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {g === "male" ? "♂ Male" : "♀ Female"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[
            { id: "elder", label: "Elder" },
            { id: "adult", label: "Adult" },
            { id: "child", label: "Child" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...sprite, ageBand: id })}
              className={`flex-1 text-[10px] font-display font-bold py-1 rounded-md border transition-all ${
                sprite.ageBand === id ? "bg-secondary text-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sprite.title}
          onChange={(e) => onChange({ ...sprite, title: e.target.value })}
          className="w-full text-xs font-display border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SPRITE_TITLES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function SpriteMenu({ onClose }) {
  const [config, setConfig] = useState(() => loadSpriteConfig());
  const [activeVillage, setActiveVillage] = useState("frontier_us");
  const [tab, setTab] = useState("sprites");
  const [saved, setSaved] = useState(false);

  const village = VILLAGES[activeVillage];
  const portraits = CUSTOMER_PORTRAITS[activeVillage] || [];
  const sprites = config.sprites[activeVillage] || [];

  const updateSprite = (idx, updated) => {
    const newSprites = sprites.map((s, i) => (i === idx ? updated : s));
    setConfig((prev) => ({ ...prev, sprites: { ...prev.sprites, [activeVillage]: newSprites } }));
    setSaved(false);
  };

  const updateNamePool = (gender, ageBand, names) => {
    setConfig((prev) => {
      const baseV = prev.namePools[activeVillage] || DEFAULT_NAME_POOLS[activeVillage];
      return {
        ...prev,
        namePools: {
          ...prev.namePools,
          [activeVillage]: {
            ...baseV,
            [gender]: {
              ...(baseV[gender] || {}),
              [ageBand]: names,
            },
          },
        },
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    saveSpriteConfig({ sprites: config.sprites, namePools: config.namePools });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const fresh = resetSpriteConfig();
    setConfig(fresh);
    setSaved(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card rounded-2xl border-2 border-yellow-400 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
    >
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-600" />
          <h2 className="font-display font-bold text-lg text-foreground">Sprite Menu</h2>
          <span className="text-xs bg-yellow-100 text-yellow-700 font-display font-bold px-2 py-0.5 rounded-full">DEV</span>
        </div>
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
        {VILLAGE_KEYS.map((vk) => (
          <button
            key={vk}
            type="button"
            onClick={() => setActiveVillage(vk)}
            className={`flex-1 py-2.5 px-2 font-display text-xs font-semibold whitespace-nowrap transition-colors min-w-0 ${
              activeVillage === vk ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {VILLAGES[vk]?.name?.split(",")[0] || vk}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-5 pt-4 flex-shrink-0">
        {[
          ["sprites", "Sprites"],
          ["names", "Name Pools"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg font-display text-sm font-bold border transition-all ${
              tab === key ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab === "sprites" && (
          <>
            <p className="font-body text-xs text-muted-foreground italic">
              Default portrait bands: indices 0–2 elder ♂, 3–5 elder ♀, 6–8 adult ♂, 9–11 adult ♀, 12–14 boys, 15–17 girls.
              Names pull from pools matching gender + age band.
            </p>
            {sprites.map((sprite, idx) => (
              <div key={sprite.id}>
                <p className="font-display text-xs text-muted-foreground mb-1.5">
                  Portrait #{sprite.portraitIndex} · default band {(sprite.ageBand || "?")} · {(sprite.gender === "female" ? "♀" : "♂")}
                </p>
                <SpriteCard
                  sprite={sprite}
                  portraitUrl={
                    resolveAssetUrl(portraits[sprite.portraitIndex]) ||
                    resolveAssetFallback(portraits[sprite.portraitIndex]) ||
                    null
                  }
                  onChange={(updated) => updateSprite(idx, updated)}
                />
              </div>
            ))}
          </>
        )}

        {tab === "names" && (
          <>
            <p className="font-body text-xs text-muted-foreground italic">
              Names for <strong>{village?.name}</strong>. Random customers pick from the bucket matching sprite gender + age band.
            </p>
            {NAME_GROUPS.map(({ gender, ageBand, label }) => (
              <NameListEditor
                key={`${gender}_${ageBand}`}
                title={label}
                names={(config.namePools[activeVillage]?.[gender]?.[ageBand]) ?? DEFAULT_NAME_POOLS[activeVillage]?.[gender]?.[ageBand] ?? []}
                onChange={(names) => updateNamePool(gender, ageBand, names)}
              />
            ))}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 p-4 border-t border-border flex-shrink-0">
        <Button variant="outline" size="sm" onClick={handleReset} className="font-display gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset config
        </Button>
        <Button size="sm" onClick={handleSave} className={`ml-auto font-display gap-1 ${saved ? "bg-success hover:bg-success" : ""}`}>
          <Save className="w-3.5 h-3.5" />
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </motion.div>
  );
}
