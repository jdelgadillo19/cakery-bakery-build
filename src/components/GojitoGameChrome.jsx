import { useAuth } from "@/lib/AuthContext";

const HUB_URL = (import.meta.env.VITE_GOJITO_HUB_URL ?? "/").replace(/\/+$/, "") || "/";

function tierLabel(profileTier, isAuthenticated, isSupabaseConfigured) {
  if (!isSupabaseConfigured) return "Bean";
  if (!isAuthenticated) return "Bean";
  if (profileTier === "guac" || profileTier === "gold" || profileTier === "paid") return "Guac";
  return "Beef";
}

function accountLine(user, isAuthenticated) {
  if (!isAuthenticated) return "Guest";
  return user?.email || user?.full_name || "Signed in";
}

export default function GojitoGameChrome() {
  const {
    isSupabaseConfigured,
    isAuthenticated,
    isLoadingAuth,
    user,
    profileTier,
    signInWithGoogle,
    logout,
  } = useAuth();

  const tier = tierLabel(profileTier, isAuthenticated, isSupabaseConfigured);
  const status = isLoadingAuth ? "Checking session…" : accountLine(user, isAuthenticated);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 border-b border-white/15 bg-black/50 px-3 py-2 backdrop-blur-md sm:px-4"
      aria-label="Gojito Games"
    >
      <a
        href={HUB_URL}
        className="flex min-w-0 items-center gap-2 rounded-lg pr-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Back to Gojito Games hub"
      >
        <img
          src="/gojito-games-hub-icon.svg"
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-md"
          decoding="async"
        />
        <span className="truncate font-body text-xs font-semibold sm:text-sm">Gojito Games</span>
      </a>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {isAuthenticated && isSupabaseConfigured && !isLoadingAuth && (
          <span className="hidden text-[10px] text-emerald-300/90 sm:inline">Cloud saves on</span>
        )}
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">
          {tier}
        </span>
        <span className="max-w-[8rem] truncate text-[10px] text-white/70 sm:max-w-[12rem] sm:text-xs" title={status}>
          {status}
        </span>
        {isSupabaseConfigured && !isLoadingAuth && (
          isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/90 hover:bg-white/20 sm:text-xs"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/90 hover:bg-white/20 sm:text-xs"
            >
              Sign in
            </button>
          )
        )}
      </div>
    </header>
  );
}
