import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import RoleSelection from "@/components/auth/role-selection";
import TutorForm from "@/components/forms/tutor-form";
import LearnerForm from "@/components/forms/learner-form";
import { useAuth } from "@/hooks";
import AppLoader from "@/components/ui/app-loader";

const Register = () => {
  const [, navigate] = useLocation();
  const { user, registerMutation, isLoading } = useAuth();
  const [registrationStep, setRegistrationStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"learner" | "tutor" | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleRoleSelect = (role: "learner" | "tutor") => {
    setSelectedRole(role);
    setRegistrationStep("form");
  };

  const handleFormSubmit = (data: any) => {
    registerMutation.mutate(data);
  };
  
  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <AppLoader size="md" text="Loading" />
      </div>
    );
  }
  
  // If user is authenticated, we'll redirect (handled in the useEffect)
  if (user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
      <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
        Join TutaLink
      </h1>
      <p className="text-center text-gray-600 mt-2 mb-8">Connect with tutors and learners in your university</p>
      
      {registerMutation.isPending ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p className="text-lg font-medium">Creating your account...</p>
        </div>
      ) : (
        <>
          {registrationStep === "role" ? (
            <RoleSelection onRoleSelect={handleRoleSelect} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Register as a {selectedRole === "tutor" ? "Tutor" : "Learner"}
                </h2>
                
                {selectedRole === "tutor" ? (
                  <TutorForm onSubmit={handleFormSubmit} />
                ) : (
                  <LearnerForm onSubmit={handleFormSubmit} />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login">
            <span className="font-medium text-primary hover:text-primary/80 underline cursor-pointer">
              Log in here
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
