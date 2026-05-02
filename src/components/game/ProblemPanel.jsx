import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Calculator } from "lucide-react";
import RecipeCard from "@/components/game/RecipeCard";
import NumericInput from "@/components/game/NumericInput";

export default function ProblemPanel({ problem, currency, onSubmit, feedback, attempts, maxAttempts = 2 }) {
  const [answer, setAnswer] = useState("");

  if (!problem) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(answer);
    if (isNaN(val) || answer.trim() === "") return;
    onSubmit(val);
    setAnswer("");
  };

  const getTitle = () => {
    if (problem.type === "cashier_total" && problem.phase === "calculate_total") return "What is the order total?";
    if (problem.type === "cashier_total" && problem.phase === "make_change") return "How much change to give back?";
    if (problem.type === "packager_division" && problem.phase === "boxes") return `How many full ${problem.container || "boxes"} can you pack?`;
    if (problem.type === "packager_division" && problem.phase === "remainder") return `How many ${problem.itemName} are left over?`;
    if (problem.type === "baker_scaling") return "How much ingredient do you need?";
    return "Solve the problem";
  };

  const getHint = () => {
    if (problem.type === "cashier_total" && problem.phase === "calculate_total") {
      return (
        <div className="space-y-1">
          {problem.order.items.map((item) => (
            <p key={item.id} className="font-display text-sm">
              {item.quantity} × {currency}{item.price.toFixed(2)} = ?
            </p>
          ))}
          {problem.order.couponPct && (
            <p className="text-accent font-display text-sm font-semibold">
              Then apply {problem.order.couponPct}% coupon discount
            </p>
          )}
        </div>
      );
    }
    if (problem.type === "cashier_total" && problem.phase === "make_change") {
      return (
        <p className="font-body text-sm text-muted-foreground">
          Customer pays <strong>{currency}{problem.order.payment.toFixed(2)}</strong> — total is <strong>{currency}{problem.order.orderTotal.toFixed(2)}</strong>.
          What is the change?
        </p>
      );
    }
    if (problem.type === "packager_division") {
      return (
        <div className="space-y-1">
          <p className="font-body text-sm text-muted-foreground">{problem.promptText}</p>
          {problem.phase === "remainder" && (
            <p className="font-display text-sm font-semibold text-primary">
              You packed {problem.answer} full boxes. How many {problem.itemName} are left over?
            </p>
          )}
        </div>
      );
    }
    if (problem.type === "baker_scaling") {
      return (
        <div className="space-y-3">
          <p className="font-body text-sm text-muted-foreground">{problem.promptText}</p>
          {problem.convertedRecipe && <RecipeCard convertedRecipe={problem.convertedRecipe} />}
        </div>
      );
    }
    return null;
  };

  const prefix = problem.type === "cashier_total" ? currency : "";
  // For baker: show unit suffix, but not for eggs (they're already counted as integers)
  const suffix = problem.type === "baker_scaling" && problem.ingredient?.unit && problem.ingredientKey !== "eggs"
    ? ` ${problem.ingredient.unit}`
    : problem.type === "packager_division"
    ? problem.phase === "boxes" ? ` ${problem.container || "boxes"}` : ` ${problem.itemName?.toLowerCase() || "items"}`
    : "";

  return (
    <div className="bg-card rounded-xl border-2 border-primary/20 p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-foreground">{getTitle()}</h3>
        <span className="ml-auto text-xs font-display text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          Attempt {attempts + 1}/{maxAttempts}
        </span>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mb-4">
        {getHint()}
      </div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.type + feedback.message}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg p-3 mb-4 flex items-start gap-2 ${
              feedback.type === "correct" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "correct"
              ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <p className="font-display text-sm font-medium">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <NumericInput
          value={answer}
          onChange={setAnswer}
          placeholder="0"
          prefix={prefix}
          suffix={suffix || undefined}
          allowDecimals={problem.type !== "packager_division"}
          autoFocus
        />
        <Button type="submit" size="lg" className="h-12 px-6 font-display font-bold flex-shrink-0">
          <Check className="w-5 h-5 mr-1" />
          Submit
        </Button>
      </form>
    </div>
  );
}