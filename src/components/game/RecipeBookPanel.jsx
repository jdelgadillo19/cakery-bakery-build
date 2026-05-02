import React, { useState, useMemo, useEffect } from "react";
import { Lock, Star, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  RARITY_CONFIG,
  SLOT_UPGRADE_COSTS,
  getMenuSlotConfig,
  getOwnedRecipes,
  getPurchasableRecipes,
  isRecipeBookUnlocked,
} from "@/lib/recipeBook";
import { computeRecipeDisplayPrice } from "@/lib/recipePricing";

function RarityBadge({ rarity }) {
  const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-display font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
    >
      {"★".repeat(cfg.stars)}
      {"☆".repeat(4 - cfg.stars)} {cfg.label}
    </span>
  );
}

function RecipeChip({ recipe, isActive, isDragging }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all select-none ${
        isDragging
          ? "shadow-xl border-primary bg-primary/10 scale-105"
          : isActive
            ? "border-primary bg-primary/5"
            : "border-border bg-card"
      }`}
    >
      <span className="text-xl">{recipe.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold truncate">{recipe.name}</p>
        <div className="flex items-center gap-1.5">
          <RarityBadge rarity={recipe.rarity} />
        </div>
      </div>
      <span className="font-display text-xs text-muted-foreground">⠿</span>
    </div>
  );
}

function EmptySlot({ index }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border-2 border-dashed border-border bg-muted/20 text-muted-foreground h-[56px]">
      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center">
        <span className="text-xs font-display font-bold text-muted-foreground/50">{index + 1}</span>
      </div>
      <span className="font-display text-xs text-muted-foreground/60">Drop recipe here</span>
    </div>
  );
}

function LockedSlot({ cost, currency }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border-2 border-dashed border-border/40 bg-muted/10 h-[56px]">
      <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
        <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
      </div>
      <span className="font-display text-xs text-muted-foreground/50">
        Buy Slot — {currency}
        {cost}
      </span>
    </div>
  );
}

function deriveActiveRecipeIds(viewSave, owned, unlockedSlots) {
  const equippedIds = viewSave.equipped_recipe_ids || [];
  const ownedIds = new Set(owned.map((r) => r.id));
  const valid = equippedIds.filter((id) => ownedIds.has(id)).slice(0, unlockedSlots);
  if (valid.length < unlockedSlots) {
    const remaining = owned.filter((r) => !valid.includes(r.id));
    const toAdd = remaining.slice(0, unlockedSlots - valid.length).map((r) => r.id);
    return [...valid, ...toAdd];
  }
  return valid;
}

function formatIngredientRow(recipe, key, displayVal) {
  if (recipe.ingredientsGrams && recipe.ingredientsGrams[key] != null) {
    return `${recipe.ingredientsGrams[key]} g`;
  }
  return displayVal;
}

/**
 * Shared recipe book body — used by RecipeBookModal and end-of-day Recipe Shop.
 */
export default function RecipeBookPanel({
  viewSave,
  currency,
  /** When false, shows locked placeholder */
  unlocked: unlockedProp,
  title = "Recipe Book",
  headerRight = null,
  /** Optional row below title (e.g. menu equip board in modal) */
  headerBelow = null,
  /** full = browse + shop drag slots; shop = purchases + slot upgrades only (equip elsewhere) */
  variant = "full",
  onPurchase,
  onEquipChange,
  onSlotUpgrade,
}) {
  const [tab, setTab] = useState(variant === "shop" ? "buy_recipes" : "my_recipes");
  const unlocked = unlockedProp ?? isRecipeBookUnlocked(viewSave);

  const owned = getOwnedRecipes(viewSave);
  const purchasable = getPurchasableRecipes(viewSave);
  const { maxSlots, unlockedSlots } = getMenuSlotConfig(viewSave);
  const totalCoins = viewSave.total_coins || 0;
  const villageKey = viewSave.village;

  const derivedActive = useMemo(() => {
    const o = getOwnedRecipes(viewSave);
    return deriveActiveRecipeIds(viewSave, o, unlockedSlots);
  }, [viewSave.equipped_recipe_ids, viewSave.recipe_book, viewSave.village, unlockedSlots]);

  const [activeIds, setActiveIds] = useState(derivedActive);
  useEffect(() => {
    setActiveIds(derivedActive);
  }, [derivedActive]);

  useEffect(() => {
    if (variant === "shop" && tab === "for_sale") setTab("buy_recipes");
  }, [variant, tab]);

  const ownedMap = useMemo(() => {
    const m = {};
    owned.forEach((r) => {
      m[r.id] = r;
    });
    return m;
  }, [owned]);

  const activeRecipes = activeIds.map((id) => ownedMap[id]).filter(Boolean);
  const activeIdSet = new Set(activeIds);
  const inactiveRecipes = owned.filter((r) => !activeIdSet.has(r.id));

  const nextSlot = unlockedSlots < maxSlots ? unlockedSlots + 1 : null;
  const nextSlotCost = nextSlot != null ? SLOT_UPGRADE_COSTS[nextSlot] : null;
  const canUpgradeSlot = !!(nextSlot && nextSlotCost != null && totalCoins >= nextSlotCost && unlockedSlots < maxSlots);

  const syncEquipped = (newIds) => {
    setActiveIds(newIds);
    onEquipChange?.(newIds);
  };

  const handleDragEnd = (result) => {
    if (variant === "shop") return;
    const { source, destination } = result;
    if (!destination) return;

    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    if (srcId === "inactive" && dstId === "active") {
      const draggedRecipe = inactiveRecipes[source.index];
      if (!draggedRecipe) return;
      const newActive = [...activeIds];
      const slotIndex = destination.index;
      newActive[slotIndex] = draggedRecipe.id;
      syncEquipped(newActive);
      return;
    }

    if (srcId === "active" && dstId === "active") {
      const newActive = [...activeIds];
      const [moved] = newActive.splice(source.index, 1);
      newActive.splice(destination.index, 0, moved);
      syncEquipped(newActive);
    }
  };

  const TABS =
    variant === "shop"
      ? [
          { key: "buy_recipes", label: `Buy Recipes (${purchasable.length})` },
          { key: "my_recipes", label: `My Recipes (${owned.length})` },
        ]
      : [
          { key: "my_recipes", label: `My Recipes (${owned.length})` },
          { key: "buy_recipes", label: `Buy Recipes (${purchasable.length})` },
          { key: "for_sale", label: "Menu slots" },
        ];

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
          <h2 className="font-display font-bold text-lg text-foreground truncate">{title}</h2>
        </div>
        {headerRight}
      </div>
      {headerBelow}

      {!unlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground">Recipe Book Locked</h3>
          <p className="font-body text-sm text-muted-foreground max-w-xs">
            Complete the tutorial (Days 1–3) to unlock this recipe book and start discovering recipes!
          </p>
          <div className="w-full space-y-2 opacity-30 pointer-events-none select-none mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border-2 border-dashed border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 px-2 font-display text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 flex-shrink-0">
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-2">
              <span className="font-display text-sm text-muted-foreground">Your Money</span>
              <span className="font-display font-bold text-foreground">
                {currency}
                {totalCoins.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
            {tab === "my_recipes" &&
              (owned.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground font-display text-sm">
                  No recipes yet. Buy some in the shop!
                </p>
              ) : (
                owned.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3 bg-card flex items-start gap-3">
                    <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-secondary/50">
                      {r.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-display font-bold text-sm">{r.name}</span>
                        <RarityBadge rarity={r.rarity} />
                        {activeIdSet.has(r.id) && (
                          <span className="text-[10px] bg-primary text-primary-foreground font-display font-bold px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="font-display text-xs text-muted-foreground">
                        Makes {r.yield} · Menu ~ {currency}
                        {computeRecipeDisplayPrice(r, { villageKey }).toFixed(2)}
                      </p>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {Object.entries(r.ingredients).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="font-body text-xs text-muted-foreground capitalize">{k}</span>
                            <span className="font-display text-xs font-semibold">{formatIngredientRow(r, k, v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {tab === "buy_recipes" &&
              (purchasable.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground font-display text-sm">
                  You own all available recipes! 🎉
                </p>
              ) : (
                purchasable.map((r) => {
                  const canAfford = totalCoins >= r.cost;
                  const menuHint = computeRecipeDisplayPrice(r, { villageKey });
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border-2 border-dashed border-border p-3 bg-muted/20 flex items-start gap-3"
                    >
                      <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-secondary/50">
                        {r.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display font-bold text-sm">{r.name}</span>
                          <RarityBadge rarity={r.rarity} />
                        </div>
                        <p className="font-display text-xs text-muted-foreground">
                          Menu ~ {currency}
                          {menuHint.toFixed(2)} · Recipe cost {currency}
                          {r.cost}
                        </p>
                        <Button
                          size="sm"
                          variant={canAfford ? "default" : "outline"}
                          disabled={!canAfford}
                          type="button"
                          onClick={() => onPurchase?.(r)}
                          className="mt-2 font-display text-xs h-8"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          {canAfford ? `Buy for ${currency}${r.cost}` : `Need ${currency}${r.cost}`}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ))}

            {variant === "shop" && (
              <div className="space-y-3 pt-4 border-t border-border mt-4">
                <h3 className="font-display font-bold text-sm text-foreground">Menu capacity</h3>
                <p className="font-body text-xs text-muted-foreground">
                  Buy extra slots here; arrange which recipes are on sale from home or tomorrow morning before opening.
                </p>
                {unlockedSlots < maxSlots && (
                  <div className="space-y-2">
                    {Array.from({ length: maxSlots - unlockedSlots }).map((_, i) => {
                      const slotNum = unlockedSlots + 1 + i;
                      const cost = SLOT_UPGRADE_COSTS[slotNum];
                      if (cost == null) return null;
                      return <LockedSlot key={slotNum} cost={cost} currency={currency} />;
                    })}
                  </div>
                )}
                {nextSlot != null && nextSlotCost != null && unlockedSlots < maxSlots && (
                  <div className="rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold text-sm">Unlock Slot {nextSlot}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        Cost: {currency}
                        {nextSlotCost}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      disabled={!canUpgradeSlot}
                      onClick={() => onSlotUpgrade?.(nextSlot, nextSlotCost)}
                      className="font-display font-bold flex-shrink-0"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {canUpgradeSlot ? "Unlock" : `Need ${currency}${nextSlotCost}`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {variant !== "shop" && tab === "for_sale" && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-bold text-sm text-foreground">
                        Active Menu Slots ({activeRecipes.length}/{unlockedSlots})
                      </h3>
                      <span className="font-display text-xs text-muted-foreground">Drag to reorder</span>
                    </div>
                    <Droppable droppableId="active">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                          {Array.from({ length: unlockedSlots }).map((_, idx) => {
                            const recipe = activeRecipes[idx];
                            if (!recipe) return <EmptySlot key={`empty-${idx}`} index={idx} />;
                            return (
                              <Draggable key={recipe.id} draggableId={recipe.id} index={idx}>
                                {(prov, snapshot) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                                    <RecipeChip recipe={recipe} isActive isDragging={snapshot.isDragging} />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {unlockedSlots < maxSlots && (
                      <div className="space-y-2 mt-2">
                        {Array.from({ length: maxSlots - unlockedSlots }).map((_, i) => {
                          const slotNum = unlockedSlots + 1 + i;
                          const cost = SLOT_UPGRADE_COSTS[slotNum];
                          return <LockedSlot key={slotNum} cost={cost} currency={currency} />;
                        })}
                      </div>
                    )}
                  </div>

                  {nextSlot != null && unlockedSlots < maxSlots && (
                    <div className="rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display font-bold text-sm">Unlock Slot {nextSlot}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          Cost: {currency}
                          {nextSlotCost}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        disabled={!canUpgradeSlot}
                        onClick={() => onSlotUpgrade?.(nextSlot, nextSlotCost)}
                        className="font-display font-bold flex-shrink-0"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        {canUpgradeSlot ? "Unlock" : `Need ${currency}${nextSlotCost}`}
                      </Button>
                    </div>
                  )}

                  <div>
                    <h3 className="font-display font-bold text-sm text-foreground mb-2">
                      Not in Use ({inactiveRecipes.length})
                    </h3>
                    {inactiveRecipes.length === 0 ? (
                      <p className="font-display text-xs text-muted-foreground text-center py-3">
                        All your recipes are active!
                      </p>
                    ) : (
                      <Droppable droppableId="inactive">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {inactiveRecipes.map((recipe, idx) => (
                              <Draggable key={recipe.id} draggableId={recipe.id} index={idx}>
                                {(prov, snapshot) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                                    <RecipeChip recipe={recipe} isActive={false} isDragging={snapshot.isDragging} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                </div>
              </DragDropContext>
            )}
          </div>
        </>
      )}
    </div>
  );
}
