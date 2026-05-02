import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paintbrush, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameSave } from "@/lib/localEntities";

const SIGN_EMOJIS = ["🧁", "🎂", "🍞", "🥐", "🍰", "🍩", "🥧", "🌸", "⭐", "🏵️", "🎀", "🫖"];

const WALL_COLORS = [
  { label: "Warm Cream", value: "bg-amber-50", hex: "#fffbeb" },
  { label: "Rose Blush", value: "bg-rose-100", hex: "#ffe4e6" },
  { label: "Mint", value: "bg-emerald-100", hex: "#d1fae5" },
  { label: "Lavender", value: "bg-purple-100", hex: "#ede9fe" },
  { label: "Sky Blue", value: "bg-sky-100", hex: "#e0f2fe" },
  { label: "Sunny Yellow", value: "bg-yellow-100", hex: "#fef9c3" },
  { label: "Slate", value: "bg-slate-100", hex: "#f1f5f9" },
  { label: "Peach", value: "bg-orange-100", hex: "#ffedd5" },
];

const COUNTER_COLORS = [
  { label: "Oak Wood", value: "bg-amber-700", hex: "#b45309" },
  { label: "Cherry", value: "bg-red-800", hex: "#991b1b" },
  { label: "Walnut", value: "bg-stone-700", hex: "#44403c" },
  { label: "Pine", value: "bg-yellow-700", hex: "#a16207" },
  { label: "Marble White", value: "bg-slate-200", hex: "#e2e8f0" },
  { label: "Ebony", value: "bg-gray-900", hex: "#111827" },
];

export default function BakeryCustomizer({ gameSave, onSaved }) {
  const [open, setOpen] = useState(false);
  const [decor, setDecor] = useState(gameSave?.bakery_decor || {
    sign_emoji: "🧁",
    wall_color: "bg-amber-50",
    counter_color: "bg-amber-700",
    banner_text: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await GameSave.update(gameSave.id, { bakery_decor: decor });
    setSaving(false);
    setOpen(false);
    onSaved?.();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-secondary/80 hover:bg-secondary rounded-full px-3 py-1.5 transition-colors"
      >
        <Paintbrush className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold text-sm">Decorate</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-foreground">🎨 Decorate Your Bakery</h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              <div className={`rounded-xl h-24 relative overflow-hidden border border-border ${decor.wall_color || "bg-amber-50"}`}>
                <div className={`absolute bottom-0 left-0 right-0 h-8 ${decor.counter_color || "bg-amber-700"}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                  <span className="text-4xl drop-shadow">{decor.sign_emoji || "🧁"}</span>
                  {decor.banner_text && (
                    <span className="font-display font-bold text-xs text-foreground/80 mt-0.5 bg-white/60 px-2 rounded-full">
                      {decor.banner_text}
                    </span>
                  )}
                </div>
              </div>

              {/* Sign emoji */}
              <div>
                <p className="font-display font-semibold text-sm text-foreground mb-2">Bakery Sign</p>
                <div className="grid grid-cols-6 gap-2">
                  {SIGN_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setDecor((d) => ({ ...d, sign_emoji: e }))}
                      className={`text-2xl h-10 rounded-lg flex items-center justify-center transition-all ${
                        decor.sign_emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-muted/70"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wall color */}
              <div>
                <p className="font-display font-semibold text-sm text-foreground mb-2">Wall Color</p>
                <div className="grid grid-cols-4 gap-2">
                  {WALL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setDecor((d) => ({ ...d, wall_color: c.value }))}
                      className={`h-9 rounded-lg border-2 transition-all ${c.value} ${
                        decor.wall_color === c.value ? "border-primary shadow-md scale-105" : "border-border"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Counter color */}
              <div>
                <p className="font-display font-semibold text-sm text-foreground mb-2">Counter Wood</p>
                <div className="grid grid-cols-6 gap-2">
                  {COUNTER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setDecor((d) => ({ ...d, counter_color: c.value }))}
                      className={`h-9 rounded-lg border-2 transition-all ${c.value} ${
                        decor.counter_color === c.value ? "border-primary shadow-md scale-105" : "border-border"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Banner text */}
              <div>
                <p className="font-display font-semibold text-sm text-foreground mb-2">Banner Slogan (optional)</p>
                <Input
                  value={decor.banner_text || ""}
                  onChange={(e) => setDecor((d) => ({ ...d, banner_text: e.target.value }))}
                  placeholder="e.g. Fresh every day!"
                  maxLength={30}
                  className="font-display"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full font-display font-bold">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <><Check className="w-4 h-4 mr-1" /> Save Decorations</>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}