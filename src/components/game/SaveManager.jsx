import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameSave } from "@/lib/localEntities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Copy, Pencil, Settings, X, Check } from "lucide-react";
import { VILLAGES } from "@/lib/gameData";
import { useQueryClient } from "@tanstack/react-query";
import { removeSaveFromStorySlots } from "@/lib/storySlots";

export default function SaveManager({ save, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // "rename" | "delete" | "copy"
  const [newName, setNewName] = useState(save.bakery_name);
  const [loading, setLoading] = useState(false);

  const village = VILLAGES[save.village];

  const handleRename = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await GameSave.update(save.id, { bakery_name: newName.trim() });
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    setLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    setLoading(true);
    await GameSave.delete(save.id);
    removeSaveFromStorySlots(save.id);
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    queryClient.invalidateQueries({ queryKey: ["storySlots"] });
    setLoading(false);
    onClose();
  };

  const handleCopy = async () => {
    setLoading(true);
    const { id, created_date, updated_date, created_by, ...saveData } = save;
    await GameSave.create({
      ...saveData,
      bakery_name: `${save.bakery_name} (Copy)`,
    });
    queryClient.invalidateQueries({ queryKey: ["gameSaves"] });
    setLoading(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-sm mx-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-bold text-foreground">Manage Save</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-muted/40 rounded-xl px-4 py-3 mb-4">
        <p className="font-display font-bold text-foreground">{save.bakery_name}</p>
        <p className="text-xs text-muted-foreground font-body">
          {village?.name} • Week {save.current_week || 1}, Day {save.current_day || 1} • {save.experience || 0} XP
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!mode && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2 font-display" onClick={() => setMode("rename")}>
              <Pencil className="w-4 h-4" /> Rename Bakery
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 font-display" onClick={() => setMode("copy")}>
              <Copy className="w-4 h-4" /> Duplicate Save
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 font-display text-destructive hover:text-destructive" onClick={() => setMode("delete")}>
              <Trash2 className="w-4 h-4" /> Delete Save
            </Button>
          </motion.div>
        )}

        {mode === "rename" && (
          <motion.div key="rename" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="font-display text-sm text-muted-foreground">Enter a new name for your bakery:</p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="font-display"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-display" onClick={() => setMode(null)}>Cancel</Button>
              <Button className="flex-1 font-display" onClick={handleRename} disabled={loading}>
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          </motion.div>
        )}

        {mode === "copy" && (
          <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="font-display text-sm text-muted-foreground">
              This will create a full copy of <strong>{save.bakery_name}</strong> with all progress intact.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-display" onClick={() => setMode(null)}>Cancel</Button>
              <Button className="flex-1 font-display" onClick={handleCopy} disabled={loading}>
                <Copy className="w-4 h-4 mr-1" /> Duplicate
              </Button>
            </div>
          </motion.div>
        )}

        {mode === "delete" && (
          <motion.div key="delete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="font-display text-sm text-destructive font-semibold">
              Are you sure? This cannot be undone.
            </p>
            <p className="font-body text-xs text-muted-foreground">
              <strong>{save.bakery_name}</strong> and all its progress will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-display" onClick={() => setMode(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 font-display" onClick={handleDelete} disabled={loading}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}