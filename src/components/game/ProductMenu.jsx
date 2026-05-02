import React, { useState, useEffect } from "react";

function ProductThumb({ product }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [product.image, product.id]);
  if (product.image && !broken) {
    return (
      <img
        src={product.image}
        alt=""
        aria-hidden
        className="w-8 h-8 object-contain flex-shrink-0"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className="text-xl">{product.emoji}</span>;
}

export default function ProductMenu({ products, currency }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="font-display font-bold text-base mb-3 text-foreground flex items-center gap-2">
        <span>📋</span> Today's Menu
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border/50"
          >
            <ProductThumb product={product} />
            <div className="min-w-0">
              <p className="font-display text-xs font-medium truncate text-foreground">
                {product.name}
              </p>
              <p className="font-display text-sm font-bold text-primary">
                {currency}{product.price.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}