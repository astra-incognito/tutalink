import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import TutorCard from "@/components/tutor-card";
import { UserWithDetails } from "@shared/schema";
import { Loader2, Search, Calendar, CheckCircle } from "lucide-react";
import useAuth from "@/hooks/use-auth";

const Home = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Fetch top tutors
  const { data: topTutors, isLoading } = useQuery<UserWithDetails[]>({
    queryKey: ["/api/tutors"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) throw new Error("Failed to fetch tutors");
      const tutors = await res.json();
      return tutors.slice(0, 4); // Only show top 4 tutors on homepage
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {/* Hero section */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="relative">
          <div className="absolute inset-0">
            <img
              className="h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80"
              alt="Students studying"
            />
            <div className="absolute inset-0 hero-gradient"></div>
          </div>
          <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
            <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-white drop-shadow-lg bg-black/20 bg-opacity-70 backdrop-blur-sm py-2 rounded-lg">Learn from the best.</span>
              <span className="block text-primary-100 drop-shadow-lg mt-2 bg-primary/30 bg-opacity-70 backdrop-blur-sm py-2 rounded-lg">Teach what you know.</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-center text-xl text-white drop-shadow-lg bg-black/30 p-3 rounded-lg sm:max-w-3xl">
              Connect with qualified tutors or share your expertise to help others excel academically.
            </p>
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
              <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                <Link href="/find-tutors">
                  <Button size="lg" variant="secondary" className="w-full flex items-center justify-center bg-white text-primary-700 hover:bg-primary-50">
                    <Search className="mr-2 h-4 w-4" />
                    Find a Tutor
                  </Button>
                </Link>
                <Link href={isAuthenticated && user?.role === "tutor" ? "/dashboard" : "/register"}>
                  <Button size="lg" className="w-full flex items-center justify-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {isAuthenticated && user?.role === "tutor" ? "My Dashboard" : "Become a Tutor"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured tutors section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Top Tutors</h2>
          <Link href="/find-tutors">
            <span className="text-primary-600 hover:text-primary-700 text-sm font-medium cursor-pointer">View all</span>
          </Link>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topTutors?.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>

      {/* How it works section */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-gray-900">How TutaLink Works</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <Search className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">1. Find Your Perfect Tutor</h3>
              <p className="mt-2 text-sm text-gray-500">
                Search through verified tutors by course, availability, or price to find the perfect match for your academic needs.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">2. Schedule a Session</h3>
              <p className="mt-2 text-sm text-gray-500">
                Book a session at a time that works for you both. Sessions can be in-person or virtual, depending on your preference.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <CheckCircle className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">3. Learn and Succeed</h3>
              <p className="mt-2 text-sm text-gray-500">
                Connect with your tutor, improve your understanding, and achieve your academic goals. Leave a review after your session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
