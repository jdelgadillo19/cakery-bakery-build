import React from "react";
import { ChefHat } from "lucide-react";

/**
 * Displays the UNSCALED converted recipe as a reference card.
 * convertedRecipe: { name, yield, ingredients: { key: { display } } }
 */
export default function RecipeCard({ convertedRecipe }) {
  if (!convertedRecipe) return null;

  const entries = Object.entries(convertedRecipe.ingredients);

  return (
    <div className="bg-secondary/50 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-sm text-foreground">{convertedRecipe.name}</span>
        <span className="ml-auto text-xs font-display text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          Makes {convertedRecipe.yield}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="font-body text-xs text-muted-foreground capitalize">{key}</span>
            <span className="font-display text-xs font-semibold text-foreground">{val.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}