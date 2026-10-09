import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { HomeGate } from "@/components/HomeGate";
import { lazy, Suspense } from "react";
const Welcome = lazy(() => import("./pages/Welcome"));
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SelectProfile from "./pages/SelectProfile";
import Onboarding from "./pages/Onboarding";
import StoryDetail from "./pages/StoryDetail";
import Player from "./pages/Player";
import HappyPlace from "./pages/HappyPlace";
import Profile from "./pages/Profile";
import KidsProfiles from "./pages/KidsProfiles";
import Universe from "./pages/Universe";

import Admin from "./pages/Admin";
import AdminUpload from "./pages/AdminUpload";
import AdminHealth from "./pages/AdminHealth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RouteTracker } from "@/components/RouteTracker";

import Insights from "./pages/Insights";
import MakeStory from "./pages/MakeStory";
import Generating from "./pages/Generating";
import BedtimeReader from "./pages/BedtimeReader";
import EpisodeReader from "./pages/EpisodeReader";
import BedtimePreview from "./pages/BedtimePreview";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteTracker />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/oauth/consent" element={<OAuthConsent />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/add-child" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/select-profile" element={<RequireAuth><SelectProfile /></RequireAuth>} />
            <Route path="/" element={<HomeGate home={<RequireAuth><Index /></RequireAuth>} welcome={<Suspense fallback={null}><Welcome /></Suspense>} />} />
            <Route path="/welcome" element={<Suspense fallback={null}><Welcome /></Suspense>} />
            <Route path="/story/:id" element={<RequireAuth><StoryDetail /></RequireAuth>} />
            <Route path="/player/:id" element={<RequireAuth><Player /></RequireAuth>} />
            <Route path="/player/:id/:episodeNumber" element={<RequireAuth><Player /></RequireAuth>} />
            <Route path="/player/:id/:episodeNumber/read" element={<RequireAuth><EpisodeReader /></RequireAuth>} />
            <Route path="/happy-place" element={<Navigate to="/my-stories" replace />} />
            <Route path="/library" element={<RequireAuth><HappyPlace view="library" /></RequireAuth>} />
            <Route path="/my-stories" element={<RequireAuth><HappyPlace view="mine" /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/profiles" element={<RequireAuth><KidsProfiles /></RequireAuth>} />
            <Route path="/universe/:id" element={<RequireAuth><Universe /></RequireAuth>} />


            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/admin/upload" element={<RequireAdmin><AdminUpload /></RequireAdmin>} />
            <Route path="/admin/health" element={<RequireAdmin><AdminHealth /></RequireAdmin>} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/insights" element={<RequireAuth><Insights /></RequireAuth>} />
            <Route path="/magic-hub" element={<RequireAuth><MakeStory /></RequireAuth>} />
            <Route path="/magic-hub/audio" element={<Navigate to="/magic-hub" replace />} />
            <Route path="/magic-hub/bedtime" element={<Navigate to="/magic-hub?format=read" replace />} />
            <Route path="/generating/:storyId" element={<RequireAuth><Generating /></RequireAuth>} />
            <Route path="/bedtime/:id" element={<RequireAuth><BedtimePreview /></RequireAuth>} />
            <Route path="/bedtime/:id/read" element={<RequireAuth><BedtimeReader /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
