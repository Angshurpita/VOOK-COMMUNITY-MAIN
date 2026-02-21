import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { PostProvider } from "./context/PostContext";
import GlobalChatListener from "./components/chat/GlobalChatListener";
import { Loader2 } from "lucide-react";

// Lazy Load Pages
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));
const Community = lazy(() => import("./pages/Community"));
const Chats = lazy(() => import("./pages/Chats"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Login = lazy(() => import("./pages/Login"));
const PostDetails = lazy(() => import("./pages/PostDetails"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (Optimized caching)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PostProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <GlobalChatListener />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Layout Route - Keeps Background3D persistent */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/create" element={<CreatePost />} />
                <Route path="/profile/:userId?" element={<Profile />} />
                <Route path="/community/:communityId?" element={<Community />} />
                <Route path="/chats/:chatId?" element={<Chats />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/post/:postId" element={<PostDetails />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PostProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
