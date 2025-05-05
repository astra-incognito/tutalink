import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import RoleSelection from "@/components/auth/role-selection";
import TutorForm from "@/components/forms/tutor-form";
import LearnerForm from "@/components/forms/learner-form";
import useAuth from "@/hooks/use-auth";

const Register = () => {
  const [location] = useLocation();
  const { register, isPendingRegister } = useAuth();
  const [registrationStep, setRegistrationStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"learner" | "tutor" | null>(null);

  const handleRoleSelect = (role: "learner" | "tutor") => {
    setSelectedRole(role);
    setRegistrationStep("form");
  };

  const handleFormSubmit = (data: any) => {
    register(data);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Join TutaLink</h1>
      
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
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login">
            <a className="font-medium text-primary-600 hover:text-primary-500">
              Log in here
            </a>
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
