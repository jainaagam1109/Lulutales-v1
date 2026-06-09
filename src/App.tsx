import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
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

import Admin from "./pages/Admin";
import AdminUpload from "./pages/AdminUpload";
import AdminHealth from "./pages/AdminHealth";
import { RequireAdmin } from "@/components/RequireAdmin";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import MagicHub from "./pages/MagicHub";
import AudioStoryForm from "./pages/AudioStoryForm";
import BedtimeStoryForm from "./pages/BedtimeStoryForm";
import Generating from "./pages/Generating";
import BedtimeReader from "./pages/BedtimeReader";
import BedtimePreview from "./pages/BedtimePreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/add-child" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/select-profile" element={<RequireAuth><SelectProfile /></RequireAuth>} />
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/story/:id" element={<RequireAuth><StoryDetail /></RequireAuth>} />
            <Route path="/player/:id" element={<RequireAuth><Player /></RequireAuth>} />
            <Route path="/player/:id/:episodeNumber" element={<RequireAuth><Player /></RequireAuth>} />
            <Route path="/happy-place" element={<RequireAuth><HappyPlace /></RequireAuth>} />
            <Route path="/library" element={<Navigate to="/happy-place" replace />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/profiles" element={<RequireAuth><KidsProfiles /></RequireAuth>} />

            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/admin/upload" element={<RequireAdmin><AdminUpload /></RequireAdmin>} />
            <Route path="/admin/health" element={<RequireAdmin><AdminHealth /></RequireAdmin>} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/insights" element={<RequireAuth><Insights /></RequireAuth>} />
            <Route path="/magic-hub" element={<RequireAuth><MagicHub /></RequireAuth>} />
            <Route path="/magic-hub/audio" element={<RequireAuth><AudioStoryForm /></RequireAuth>} />
            <Route path="/magic-hub/bedtime" element={<RequireAuth><BedtimeStoryForm /></RequireAuth>} />
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
