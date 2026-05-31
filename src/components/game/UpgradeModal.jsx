// ============================================================
// CAKERY BAKERY — Upgrade / full-access request modal
// Shown whenever a locked feature is tapped in the free build.
// ============================================================

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Mail, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  FULL_ACCESS_PAYMENT_MESSAGE,
  FULL_ACCESS_REQUEST_SENT_MESSAGE,
  FULL_ACCESS_SIGN_IN_MESSAGE,
  hasLocalFullAccessRequest,
} from "@gojito/shared";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   message?: string,
 * }} props
 */
export default function UpgradeModal({ open, onClose, message }) {
  const { isAuthenticated, isSupabaseConfigured, user, requestFullAccess, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (!open) {
      setStatusNote("");
      setBusy(false);
      return;
    }
    if (isAuthenticated && user?.id && user.id !== "local" && hasLocalFullAccessRequest(user.id)) {
      setStatusNote(FULL_ACCESS_REQUEST_SENT_MESSAGE);
    }
  }, [open, isAuthenticated, user?.id]);

  const handleRequestAccess = async () => {
    if (!isAuthenticated) {
      void signInWithGoogle();
      return;
    }
    setBusy(true);
    setStatusNote("");
    const result = await requestFullAccess("cakery_bakery", message || null);
    setStatusNote(result.message || (result.ok ? FULL_ACCESS_REQUEST_SENT_MESSAGE : "Could not send your request."));
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <div className="relative">
                <Lock className="w-7 h-7 text-primary" />
                <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5" />
              </div>
            </div>

            <h2 className="font-display font-bold text-2xl text-foreground mb-2">
              Full access
            </h2>

            <p className="font-body text-muted-foreground text-sm mb-2 leading-relaxed">
              {message || "This feature is part of the full Cakery Bakery experience."}
            </p>
            <p className="font-body text-muted-foreground text-sm mb-4 leading-relaxed">
              Unlock all villages, roles, recipes, and unlimited weeks when full access is enabled on your account.
            </p>
            <p className="font-body text-xs text-muted-foreground mb-5 leading-relaxed rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left">
              {FULL_ACCESS_PAYMENT_MESSAGE}
            </p>

            {statusNote ? (
              <p className="font-body text-sm text-primary mb-4 leading-relaxed">{statusNote}</p>
            ) : null}

            {!isAuthenticated ? (
              <Button
                size="lg"
                className="w-full h-12 font-display font-bold text-base shadow-lg"
                onClick={() => {
                  void signInWithGoogle();
                  onClose();
                }}
                disabled={!isSupabaseConfigured}
              >
                Sign in to request access
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full h-12 font-display font-bold text-base shadow-lg"
                onClick={() => void handleRequestAccess()}
                disabled={busy || !isSupabaseConfigured}
              >
                <Mail className="w-4 h-4 mr-2" />
                {busy ? "Sending request…" : "Request full access"}
              </Button>
            )}

            {!isSupabaseConfigured ? (
              <p className="mt-3 text-xs text-muted-foreground font-body">{FULL_ACCESS_SIGN_IN_MESSAGE}</p>
            ) : null}

            <button
              onClick={onClose}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
