import React, { useMemo, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getMenuSlotConfig, getOwnedRecipes } from "@/lib/recipeBook";

function insertRecipeAt(slots, recipeId, destIdx) {
  const n = slots.length;
  const cleared = slots.map((s) => (s === recipeId ? null : s));
  let ids = cleared.filter(Boolean);
  ids = ids.filter((x) => x !== recipeId);
  const pos = Math.min(Math.max(0, destIdx), n);
  ids.splice(pos, 0, recipeId);
  return ids.slice(0, n);
}

function padSlots(filledIds, unlockedSlots) {
  const out = [...filledIds];
  while (out.length < unlockedSlots) out.push(null);
  return out.slice(0, unlockedSlots);
}

/** Pull filled IDs left after a removal so menu gaps collapse toward slot 1 */
function compactFilledSlots(slots, unlockedSlots) {
  return padSlots(slots.filter(Boolean), unlockedSlots);
}

function RecipeStrip({ recipe, isDragging }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all select-none ${
        isDragging ? "shadow-lg border-primary bg-primary/10 scale-[1.02]" : "border-border bg-card"
      }`}
    >
      <span className="text-xl">{recipe.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold truncate">{recipe.name}</p>
      </div>
    </div>
  );
}

/**
 * Drag recipes between My Recipes and menu slots (shift-fill onto slots; compact when pulled off).
 */
export default function MenuEquipBoard({ gameSave, onChange }) {
  const { maxSlots, unlockedSlots } = getMenuSlotConfig(gameSave);
  const owned = getOwnedRecipes(gameSave);
  const ownedMap = useMemo(() => Object.fromEntries(owned.map((r) => [r.id, r])), [owned]);

  const equipped = gameSave.equipped_recipe_ids || [];
  const initialPad = padSlots(
    equipped.filter((id) => ownedMap[id]).slice(0, unlockedSlots),
    unlockedSlots,
  );

  const [slotIds, setSlotIds] = useState(initialPad);

  useEffect(() => {
    setSlotIds(initialPad);
  }, [gameSave.equipped_recipe_ids, gameSave.menu_slots?.unlockedSlots, gameSave.village, gameSave.recipe_book, unlockedSlots]);

  const inMenuSet = new Set(slotIds.filter(Boolean));
  const paletteRecipes = owned.filter((r) => !inMenuSet.has(r.id));

  const persist = (nextSlots) => {
    setSlotIds(nextSlots);
    onChange(nextSlots.filter(Boolean));
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // Drag off the menu → back into My recipes (palette)
    if (destination.droppableId === "palette" && source.droppableId === "menu-slots") {
      const recipeId = slotIds[source.index];
      if (!recipeId) return;
      const cleared = [...slotIds];
      cleared[source.index] = null;
      persist(compactFilledSlots(cleared, unlockedSlots));
      return;
    }

    if (destination.droppableId === "menu-slots") {
      const destIdx = destination.index;
      if (source.droppableId === "palette") {
        const r = paletteRecipes[source.index];
        if (!r) return;
        persist(padSlots(insertRecipeAt(slotIds, r.id, destIdx), unlockedSlots));
        return;
      }
      if (source.droppableId === "menu-slots") {
        const recipeId = slotIds[source.index];
        if (!recipeId) return;
        persist(padSlots(insertRecipeAt(slotIds, recipeId, destIdx), unlockedSlots));
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-foreground mb-2">
            Menu slots ({unlockedSlots}/{maxSlots})
          </h3>
          <p className="font-body text-xs text-muted-foreground mb-2">
            Drag recipes here for today&apos;s cashier menu. Drop onto My recipes below to take something off the menu.
            Moving within slots shifts other items to fill gaps.
          </p>
          <Droppable droppableId="menu-slots">
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="space-y-2">
                {slotIds.map((id, idx) => (
                  <Draggable
                    key={`cell-${idx}`}
                    draggableId={id ? `m-${id}-${idx}` : `empty-${idx}`}
                    index={idx}
                    isDragDisabled={!id}
                  >
                    {(dragProv, snap) => (
                      <div ref={dragProv.innerRef} {...dragProv.draggableProps} {...dragProv.dragHandleProps}>
                        {id && ownedMap[id] ? (
                          <RecipeStrip recipe={ownedMap[id]} isDragging={snap.isDragging} />
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg px-3 py-2 border-2 border-dashed border-border bg-muted/15 text-muted-foreground h-[56px]">
                            <span className="font-display text-xs">Slot {idx + 1} — drop here</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
          {unlockedSlots < maxSlots && (
            <p className="font-display text-[11px] text-muted-foreground mt-2">
              Buy more slots at the recipe market after work.
            </p>
          )}
        </div>

        <div>
          <h3 className="font-display font-bold text-sm text-foreground mb-2">
            My recipes ({paletteRecipes.length} not on menu)
          </h3>
          <Droppable droppableId="palette" direction="vertical">
            {(prov) => (
              <div
                ref={prov.innerRef}
                {...prov.droppableProps}
                className={`space-y-2 min-h-[52px] rounded-lg border border-dashed px-2 py-2 transition-colors ${
                  paletteRecipes.length === 0 ? "border-primary/25 bg-primary/5" : "border-transparent"
                }`}
              >
                {paletteRecipes.length === 0 ? (
                  <p className="font-display text-xs text-muted-foreground py-2 text-center">
                    All recipes are on the menu — drag one here to remove it from today&apos;s lineup.
                  </p>
                ) : (
                  paletteRecipes.map((recipe, index) => (
                    <Draggable key={recipe.id} draggableId={`p-${recipe.id}`} index={index}>
                      {(dragProv, snap) => (
                        <div ref={dragProv.innerRef} {...dragProv.draggableProps} {...dragProv.dragHandleProps}>
                          <RecipeStrip recipe={recipe} isDragging={snap.isDragging} />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </DragDropContext>
  );
}
