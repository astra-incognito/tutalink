import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks";

const Navbar = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const isAuthenticated = !!user;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-2xl font-bold text-primary cursor-pointer">TutaLink</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <span
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer ${
                    location === "/"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Home
                </span>
              </Link>
              <Link href="/find-tutors">
                <span
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer ${
                    location === "/find-tutors"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Find Tutors
                </span>
              </Link>
              {isAuthenticated && (
                <>
                  <Link href="/dashboard">
                    <span
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer ${
                        location === "/dashboard"
                          ? "border-primary text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      Dashboard
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-6 w-6" />
                </button>

                {/* Profile dropdown */}
                <div className="ml-3 relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative rounded-full bg-white flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <span className="sr-only">Open user menu</span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src="https://github.com/shadcn.png"
                            alt={user?.fullName || "User"}
                          />
                          <AvatarFallback>
                            {getInitials(user?.fullName || "User")}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href="/dashboard">
                        <DropdownMenuItem className="cursor-pointer">
                          Dashboard
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/profile">
                        <DropdownMenuItem className="cursor-pointer">
                          Profile
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer">
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost" className="cursor-pointer">Login</Button>
                </Link>
                <Link href="/register">
                  <Button className="cursor-pointer">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/">
              <span
                className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                  location === "/"
                    ? "bg-primary-50 border-primary text-primary-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                Home
              </span>
            </Link>
            <Link href="/find-tutors">
              <span
                className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                  location === "/find-tutors"
                    ? "bg-primary-50 border-primary text-primary-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                Find Tutors
              </span>
            </Link>
            {isAuthenticated && (
              <Link href="/dashboard">
                <span
                  className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                    location === "/dashboard"
                      ? "bg-primary-50 border-primary text-primary-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  Dashboard
                </span>
              </Link>
            )}
          </div>
          {isAuthenticated ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt={user?.fullName || "User"}
                    />
                    <AvatarFallback>
                      {getInitials(user?.fullName || "User")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {user?.fullName}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {user?.username}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link href="/profile">
                  <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer">
                    Your Profile
                  </span>
                </Link>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center justify-around">
                <Link href="/login">
                  <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer">
                    Login
                  </span>
                </Link>
                <Link href="/register">
                  <span className="block px-4 py-2 text-base font-medium text-primary-600 hover:text-primary-800 cursor-pointer">
                    Sign Up
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
