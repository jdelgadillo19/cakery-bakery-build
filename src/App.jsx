import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { BuildConfigProvider } from '@/lib/BuildConfigContext';
import Home from './pages/Home';
import GameDay from './pages/GameDay';
import StorySaveSelect from './pages/StorySaveSelect';
import StoryNewGame from './pages/StoryNewGame';
import StoryWelcome from './pages/StoryWelcome';
import WeeklySummary from './pages/WeeklySummary';
import Leaderboard from './pages/Leaderboard';
import ArcadeSetup from './pages/ArcadeSetup';
import ArcadePlay from './pages/ArcadePlay';
import GojitoGameChrome from '@/components/GojitoGameChrome';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-game" element={<Navigate to="/story" replace />} />
      <Route path="/story" element={<StorySaveSelect />} />
      <Route path="/story/new" element={<StoryNewGame />} />
      <Route path="/story/resume" element={<StoryWelcome />} />
      <Route path="/play" element={<GameDay />} />
      <Route path="/weekly-summary" element={<WeeklySummary />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/arcade-setup" element={<ArcadeSetup />} />
      <Route path="/arcade" element={<ArcadePlay />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function routerBasename() {
  const b = import.meta.env.BASE_URL;
  return b.endsWith("/") ? b.slice(0, -1) : b;
}

function App() {

  return (
    <BuildConfigProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router basename={routerBasename() || undefined}>
            <GojitoGameChrome />
            <div className="gojito-nav-offset">
              <AuthenticatedApp />
            </div>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </BuildConfigProvider>
  )
}

export default App