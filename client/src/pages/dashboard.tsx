import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import TutorDashboard from "@/components/dashboard/tutor-dashboard";
import LearnerDashboard from "@/components/dashboard/learner-dashboard";
import useAuth from "@/hooks/use-auth";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: isAuthLoading, refetchUser } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthLoading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render dashboard based on user role
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {user?.role === "tutor" ? (
        <TutorDashboard user={user} refetchUser={refetchUser} />
      ) : (
        <LearnerDashboard user={user} refetchUser={refetchUser} />
      )}
    </div>
  );
};

export default Dashboard;