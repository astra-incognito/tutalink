import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Book, Star, Calendar, Edit, Plus } from "lucide-react";
import SessionCard from "@/components/session-card";
import ReviewCard from "@/components/review-card";
import useAuth from "@/hooks/use-auth";
import { SessionWithDetails, ReviewWithDetails } from "@shared/schema";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // If not authenticated, redirect to login
  if (!isAuthLoading && !isAuthenticated) {
    navigate("/login");
    return null;
  }

  // Get user info for display
  const role = user?.role || "";
  const isTutor = role === "tutor";

  // Fetch sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/sessions"],
    enabled: isAuthenticated,
  });

  // Fetch reviews if user is a tutor
  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
  } = useQuery<ReviewWithDetails[]>({
    queryKey: [`/api/tutors/${user?.id}/reviews`],
    enabled: isAuthenticated && isTutor,
  });

  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Filter sessions by status
  const pendingSessions = sessions.filter(s => s.status === "pending");
  const upcomingSessions = sessions.filter(s => s.status === "accepted");
  const completedSessions = sessions.filter(s => s.status === "completed");
  const cancelledSessions = sessions.filter(s => s.status === "cancelled" || s.status === "rejected");

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {/* Dashboard Header */}
      <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-6">
        <div className="flex items-start space-x-5">
          <div className="flex-shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://github.com/shadcn.png" alt={user?.fullName || "User"} />
              <AvatarFallback>{getInitials(user?.fullName || "User")}</AvatarFallback>
            </Avatar>
          </div>
          <div className="pt-1.5">
            <h1 className="text-2xl font-bold text-gray-900">{user?.fullName}</h1>
            <p className="text-sm font-medium text-gray-500">
              {isTutor ? "Tutor Dashboard" : "Learner Dashboard"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          {isTutor && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Sidebar - Stats & Info */}
        <div className="lg:col-span-1">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-3">
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Sessions
                        </dt>
                        <dd className="text-3xl font-semibold text-gray-900">
                          {isLoadingSessions ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            sessions.length
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>

                {isTutor && (
                  <>
                    <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                            <Star className="h-6 w-6 text-primary" />
                          </div>
                          <div className="ml-3">
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Average Rating
                            </dt>
                            <dd className="text-3xl font-semibold text-gray-900">
                              {isLoadingReviews ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : reviews.length > 0 ? (
                                (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                              ) : (
                                "N/A"
                              )}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                            <Book className="h-6 w-6 text-primary" />
                          </div>
                          <div className="ml-3">
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Course Offerings
                            </dt>
                            <dd className="text-3xl font-semibold text-gray-900">
                              {user?.courses?.length || 0}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {!isTutor && (
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="ml-3">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Tutors Met
                          </dt>
                          <dd className="text-3xl font-semibold text-gray-900">
                            {isLoadingSessions ? (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                              new Set(sessions.map(s => s.tutorId)).size
                            )}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User-specific info */}
          {isTutor && (
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user?.courses?.map((course) => (
                    <div
                      key={course.id}
                      className="relative rounded-lg border border-gray-300 bg-white px-3 py-3 shadow-sm flex items-center justify-between hover:border-gray-400"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {course.course.title} ({course.course.code})
                        </p>
                        <div className="mt-1 flex items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.isPaid ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {course.isPaid ? 'Paid' : 'Free'}
                          </span>
                          {course.isPaid && (
                            <p className="ml-2 text-sm text-gray-500">${course.hourlyRate}/hour</p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button className="w-full" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Course
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Sessions & Reviews */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-4"
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              {isTutor && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Sessions</CardTitle>
                  <CardDescription>
                    Your upcoming and pending session requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pendingSessions.length === 0 && upcomingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No pending or upcoming sessions
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pendingSessions.length > 0 && (
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">Pending Requests</h3>
                          {pendingSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                      
                      <Separator />
                      
                      {upcomingSessions.length > 0 && (
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">Upcoming Sessions</h3>
                          {upcomingSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {isTutor && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>
                      What your students are saying
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingReviews ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No reviews yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.slice(0, 2).map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                        {reviews.length > 2 && (
                          <Button 
                            variant="ghost" 
                            className="w-full" 
                            onClick={() => setActiveTab("reviews")}
                          >
                            View all {reviews.length} reviews
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle>All Sessions</CardTitle>
                  <CardDescription>
                    Manage your tutoring sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upcoming" className="mb-4">
                    <TabsList className="grid grid-cols-4">
                      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                      <TabsTrigger value="pending">Pending</TabsTrigger>
                      <TabsTrigger value="completed">Completed</TabsTrigger>
                      <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upcoming" className="mt-4 max-h-[600px] overflow-y-auto">
                      {isLoadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : upcomingSessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No upcoming sessions
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {upcomingSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="pending" className="mt-4 max-h-[600px] overflow-y-auto">
                      {isLoadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : pendingSessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No pending session requests
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pendingSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="completed" className="mt-4 max-h-[600px] overflow-y-auto">
                      {isLoadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : completedSessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No completed sessions
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {completedSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="cancelled" className="mt-4 max-h-[600px] overflow-y-auto">
                      {isLoadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : cancelledSessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No cancelled sessions
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cancelledSessions.map((session) => (
                            <SessionCard 
                              key={session.id} 
                              session={session} 
                              onStatusChange={refetchSessions}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab (Tutor only) */}
            {isTutor && (
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>All Reviews</CardTitle>
                    <CardDescription>
                      See what your students think about your tutoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    {isLoadingReviews ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No reviews yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
