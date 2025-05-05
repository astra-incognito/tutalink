import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { AuthProvider } from "./hooks";
import { ProtectedRoute } from "./lib/protected-route";
import AppLoader from "@/components/ui/app-loader";
import { trackPageView, setupErrorTracking } from "./lib/analytics";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import FindTutors from "@/pages/find-tutors";
import TutorProfile from "@/pages/tutor-profile";
import Messages from "@/pages/messages";
import NotFound from "@/pages/not-found";

// Layout
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

// Route tracking component to monitor page views and navigation
function RouteTracker() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Track page view on each location change
    trackPageView(location);
    
    // Record the start time for duration calculation
    const startTime = Date.now();
    
    // Clean up function to calculate duration on route change/unmount
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000); // Duration in seconds
      if (duration > 1) { // Avoid tracking very short views (e.g., redirects)
        trackPageView(location, duration);
      }
    };
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <RouteTracker />
      <Navbar />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <Route path="/find-tutors" component={FindTutors} />
          <Route path="/tutors/:id" component={TutorProfile} />
          <ProtectedRoute path="/messages" component={Messages} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize error tracking for unhandled exceptions
    setupErrorTracking();
    
    // Simulate app initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <AppLoader fullScreen size="lg" text="Starting TutaLink" />;
  }

  return (
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Router />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
