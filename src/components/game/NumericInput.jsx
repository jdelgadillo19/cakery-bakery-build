import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * NumericInput — a text-mode input that only accepts valid positive numbers/decimals.
 * - type="text" + inputMode="decimal"
 * - Blocks non-numeric characters on keydown
 * - Shows inline error on invalid submission attempt
 * - Prevents scroll-wheel value changes
 */
export default function NumericInput({
  value,
  onChange,
  placeholder = "0",
  className,
  allowDecimals = true,
  autoFocus = false,
  prefix,
  suffix,
  ...rest
}) {
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    const key = e.key;
    const current = e.target.value;

    // Always allow: control keys, arrows, backspace, delete, tab, enter
    if (
      e.ctrlKey || e.metaKey ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"].includes(key)
    ) {
      setError("");
      return;
    }

    // Allow digits
    if (/^\d$/.test(key)) {
      setError("");
      return;
    }

    // Allow decimal point (once) if decimals are enabled
    if (allowDecimals && (key === "." || key === ",")) {
      if (current.includes(".")) {
        e.preventDefault();
        setError("Only one decimal point allowed.");
        return;
      }
      setError("");
      return;
    }

    // Block everything else
    e.preventDefault();
    if (key !== "-") {
      setError("Only numbers are allowed.");
    }
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    // Strip anything that isn't digit or dot
    const cleaned = raw.replace(/[^0-9.]/g, "");
    // Prevent multiple dots
    const parts = cleaned.split(".");
    const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
    onChange(sanitized);
    if (sanitized) setError("");
  };

  const handleWheel = (e) => {
    // Prevent scroll from modifying value
    e.target.blur();
  };

  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="relative flex-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-muted-foreground select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "font-display text-lg font-bold h-12",
            prefix ? "pl-8" : "",
            suffix ? "pr-12" : "",
            error ? "border-destructive focus-visible:ring-destructive/30" : "",
            className
          )}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-sm text-muted-foreground select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs font-display text-destructive pl-1">{error}</p>
      )}
    </div>
  );
}