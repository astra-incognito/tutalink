import React from "react";
import AppLogo from "./app-logo";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  text?: string;
}

const AppLoader: React.FC<AppLoaderProps> = ({ 
  size = "md", 
  fullScreen = false,
  text = "Loading TutaLink"
}) => {
  const logoSize = {
    sm: 40,
    md: 60,
    lg: 80
  }[size];
  
  const content = (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <AppLogo size={logoSize} className="animate-bounce" />
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-black/10 rounded-full animate-pulse" />
      </div>
      
      {text && (
        <div className="mt-8 text-center">
          <p className="text-lg font-semibold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent animate-pulse">
            {text}
          </p>
          <div className="mt-2 flex space-x-1 justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }
  
  return content;
};

export default AppLoader;