// ============================================================
// Recipe purchases — pure patches for local draft updates (Story shop)
// ============================================================

export function patchRecipePurchase(draft, gameSave, recipe) {
  const locale = gameSave.village;
  const localeBook = draft.recipe_book?.[locale] || {
    unlocked: true,
    tutorialComplete: true,
    ownedRecipeIds: [],
  };
  const owned = new Set(localeBook.ownedRecipeIds || []);
  if (owned.has(recipe.id)) return draft;
  const cost = Number(recipe.cost || 0);
  return {
    ...draft,
    coinsSpent: draft.coinsSpent + cost,
    recipe_book: {
      ...draft.recipe_book,
      [locale]: {
        ...localeBook,
        ownedRecipeIds: [...(localeBook.ownedRecipeIds || []), recipe.id],
      },
    },
  };
}

export function patchEquippedRecipes(draft, newEquippedIds) {
  return {
    ...draft,
    equipped_recipe_ids: [...newEquippedIds],
  };
}

export function patchMenuSlots(draft, nextSlots) {
  return {
    ...draft,
    menu_slots: { ...nextSlots },
  };
}

export function patchSlotUpgrade(draft, nextSlot, cost) {
  const c = Number(cost || 0);
  const prev = draft.menu_slots || { maxSlots: 6, unlockedSlots: 4 };
  const maxS = prev.maxSlots ?? 6;
  const bumped = Math.min(maxS, Math.max(prev.unlockedSlots ?? 4, Number(nextSlot) || 0));
  return {
    ...draft,
    coinsSpent: draft.coinsSpent + c,
    menu_slots: {
      ...prev,
      maxSlots: maxS,
      unlockedSlots: bumped,
    },
  };
}

export function createShoppingDraft(gameSave) {
  return {
    recipe_book: JSON.parse(JSON.stringify(gameSave.recipe_book || {})),
    equipped_recipe_ids: [...(gameSave.equipped_recipe_ids || [])],
    menu_slots: {
      ...(gameSave.menu_slots || { maxSlots: 6, unlockedSlots: 4 }),
    },
    coinsSpent: 0,
  };
}
