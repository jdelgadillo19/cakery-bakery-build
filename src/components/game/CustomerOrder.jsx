import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

function LineThumb({ item }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [item.image, item.id]);
  if (item.image && !broken) {
    return (
      <img
        src={item.image}
        alt=""
        className="w-7 h-7 object-contain flex-shrink-0"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className="text-lg">{item.emoji}</span>;
}

export default function CustomerOrder({ order, currency, showTotal }) {
  const [portraitBroken, setPortraitBroken] = useState(false);
  useEffect(() => {
    setPortraitBroken(false);
  }, [order?.portrait, order?.customerName]);

  if (!order) return null;

  const portraitSrc = portraitBroken && order.portraitFallback ? order.portraitFallback : order.portrait;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl border border-border p-5 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Character portrait */}
        <motion.div
          key={order.customerName}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 flex-shrink-0"
        >
          {portraitSrc ? (
            <img
              src={portraitSrc}
              alt={order.customerName}
              className="w-full h-full object-contain drop-shadow-md"
              onError={() => setPortraitBroken(true)}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-3xl">
              🧑
            </div>
          )}
        </motion.div>

        {/* Speech bubble */}
        <div className="flex-1 relative bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3 border border-border">
          <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-secondary/60 border-b-8 border-b-transparent" />
          <h3 className="font-display font-bold text-foreground text-sm">{order.customerName}</h3>
          <p className="text-xs text-muted-foreground font-body italic mt-0.5">
            "Hello! I'd like to order..."
          </p>
          {order.couponPct && (
            <div className="inline-flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 rounded-full px-2 py-0.5 mt-1.5">
              <span className="text-xs">🎟️</span>
              <span className="font-display font-bold text-xs">{order.couponPct}% OFF</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <LineThumb item={item} />
              <span className="font-display text-sm text-foreground">
                {item.quantity}× {item.name}
              </span>
            </div>
            <span className="font-display font-semibold text-sm text-foreground">
              {currency}{item.price.toFixed(2)} each
            </span>
          </motion.div>
        ))}
      </div>

      {showTotal && (
        <div className="pt-3 border-t border-border space-y-1">
          {order.couponPct && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="font-display">Subtotal</span>
                <span className="font-display">{currency}{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-accent">
                <span className="font-display">🎟️ {order.couponPct}% coupon</span>
                <span className="font-display font-semibold">−{currency}{order.discountAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-display text-sm font-bold">Total Due</span>
            </div>
            <span className="font-display font-bold text-lg text-primary">
              {currency}{order.orderTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}