import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Calculator } from "lucide-react";

export default function CashRegister({
  order,
  currency,
  phase, // "calculate_total" | "make_change"
  onSubmitTotal,
  onSubmitChange,
  feedback,
}) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseFloat(answer);
    if (isNaN(value)) return;

    if (phase === "calculate_total") {
      onSubmitTotal(value);
    } else {
      onSubmitChange(value);
    }
    setAnswer("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border-2 border-primary/20 p-5 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-foreground">
          {phase === "calculate_total" ? "What's the total?" : "How much change?"}
        </h3>
      </div>

      {phase === "calculate_total" && (
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="font-body text-sm text-muted-foreground">
            Add up all the items to find the <strong>order total</strong>.
            {order.couponPct && (
              <span className="ml-1 text-accent font-semibold">
                Then apply the {order.couponPct}% coupon!
              </span>
            )}
          </p>
          <div className="mt-2 space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="font-display text-sm text-foreground">
                {item.quantity} × {currency}{item.price.toFixed(2)} = ?
              </p>
            ))}
          </div>
          {order.couponPct && (
            <div className="mt-2 pt-2 border-t border-border space-y-0.5">
              <p className="font-display text-xs text-muted-foreground">
                Subtotal: {currency}{order.subtotal.toFixed(2)}
              </p>
              <p className="font-display text-xs text-accent font-semibold">
                🎟️ {order.couponPct}% coupon = −{currency}{order.discountAmount.toFixed(2)}
              </p>
              <p className="font-display text-sm font-bold text-foreground">
                Final total = ?
              </p>
            </div>
          )}
        </div>
      )}

      {phase === "make_change" && (
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="font-body text-sm text-muted-foreground">
            The customer pays <strong className="text-foreground">{currency}{order.payment.toFixed(2)}</strong>.
            The total is <strong className="text-foreground">{currency}{order.orderTotal.toFixed(2)}</strong>.
          </p>
          <p className="font-body text-sm text-muted-foreground mt-1">
            How much <strong>change</strong> do they get back?
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`rounded-lg p-3 mb-4 flex items-center gap-2 ${
              feedback.type === "correct"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "correct" ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="font-display text-sm font-medium">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-muted-foreground">
            {currency}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="0.00"
            className="pl-8 font-display text-lg font-bold h-12"
            autoFocus
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6 font-display font-bold">
          <Check className="w-5 h-5 mr-1" />
          Submit
        </Button>
      </form>
    </motion.div>
  );
}