import { GojitoNav } from "@gojito/nav";
import { useAuth } from "@/lib/AuthContext";

const HUB_URL = (import.meta.env.VITE_GOJITO_HUB_URL ?? "/").replace(/\/+$/, "") || "/";
const ICON_SRC = `${import.meta.env.BASE_URL}gojito-games-hub-icon.svg`.replace(/\/{2,}/g, "/");

export default function GojitoGameChrome() {
  const {
    isSupabaseConfigured,
    isAuthenticated,
    isLoadingAuth,
    user,
    profileTier,
    signInWithGoogle,
    logout,
    refreshEntitlements,
    requestFullAccess,
  } = useAuth();

  return (
    <GojitoNav
      surface="game"
      gameTitle="Cakery Bakery"
      hubUrl={HUB_URL}
      iconSrc={ICON_SRC}
      isLoading={isLoadingAuth}
      isAuthenticated={isAuthenticated}
      isSupabaseConfigured={isSupabaseConfigured}
      user={user?.email != null || user?.full_name ? { email: user.email, full_name: user.full_name } : undefined}
      profileTier={profileTier}
      onSignIn={() => void signInWithGoogle()}
      onSignOut={() => void logout()}
      onRefreshAccess={() => refreshEntitlements()}
      onRequestFullAccess={() => requestFullAccess("cakery_bakery")}
    />
  );
}
