import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AddCourseDialog from "@/components/dialogs/add-course-dialog";
import EditProfileDialog from "@/components/dialogs/edit-profile-dialog";
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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  User, 
  Book, 
  Star, 
  Calendar, 
  Edit, 
  Plus, 
  Clock,
  DollarSign,
  CheckCircle,
  MessageSquare,
  FileEdit,
  BarChart,
  ListChecks,
  GraduationCap,
  Lightbulb
} from "lucide-react";
import SessionCard from "@/components/session-card";
import ReviewCard from "@/components/review-card";
import { UserWithDetails, SessionWithDetails, ReviewWithDetails, TutorCourse, Course } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TutorDashboardProps {
  user: UserWithDetails;
  refetchUser: () => void;
}

const TutorDashboard = ({ user, refetchUser }: TutorDashboardProps) => {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch reviews
  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
  } = useQuery<ReviewWithDetails[]>({
    queryKey: [`/api/tutors/${user?.id}/reviews`],
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
  
  // Get current month's statistics
  const currentMonth = new Date().getMonth();
  const currentMonthSessions = sessions.filter(s => 
    new Date(s.scheduleDate).getMonth() === currentMonth && s.status === "completed"
  );
  
  const totalEarned = currentMonthSessions.reduce((sum, session) => 
    sum + (session.price || 0), 0
  );
  
  const totalHours = currentMonthSessions.reduce((sum, session) => 
    sum + session.duration, 0
  );

  return (
    <>
      {/* Dashboard Header */}
      <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-6 bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-lg shadow-sm">
        <div className="flex items-start space-x-5">
          <div className="flex-shrink-0">
            <Avatar className="h-20 w-20 ring-4 ring-white">
              <AvatarImage src="https://github.com/shadcn.png" alt={user?.fullName || "User"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(user?.fullName || "User")}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="pt-1.5">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">{user?.fullName}</h1>
              <Badge className="ml-2 bg-primary">Tutor</Badge>
            </div>
            <p className="text-sm font-medium text-gray-500">
              {user?.department} • Year {user?.yearOfStudy}
            </p>
            <div className="mt-1 flex items-center">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="font-medium">
                  {reviews.length > 0 
                    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
                    : "No ratings"}
                </span>
              </div>
              <span className="mx-2 text-gray-300">•</span>
              <span>{reviews.length} reviews</span>
              <span className="mx-2 text-gray-300">•</span>
              <span>{user?.courses?.length || 0} courses</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
          <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button onClick={() => setIsAddCourseOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Sidebar - Stats & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Performance overview card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <BarChart className="h-5 w-5 mr-2" />
                This Month's Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">${totalEarned}</span>
                  <span className="text-xs text-gray-500">Earned</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Clock className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">{totalHours}</span>
                  <span className="text-xs text-gray-500">Hours</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">{currentMonthSessions.length}</span>
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">
                    {reviews.filter(r => 
                      new Date(r.createdAt).getMonth() === currentMonth
                    ).length}
                  </span>
                  <span className="text-xs text-gray-500">Reviews</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" className="w-full text-primary text-sm">
                View Detailed Analytics
              </Button>
            </CardFooter>
          </Card>

          {/* My Courses card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <Book className="h-5 w-5 mr-2" />
                My Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user?.courses?.map((course: TutorCourse & { course: Course }) => (
                  <div
                    key={course.id}
                    className="relative rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm flex items-center justify-between hover:border-primary transition-colors group"
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
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button className="w-full" variant="outline" onClick={() => setIsAddCourseOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Course
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips for Success */}
          <Card className="bg-gradient-to-br from-blue-50 to-primary-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <Lightbulb className="h-5 w-5 mr-2" />
                Tips for Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Respond to session requests quickly to improve your acceptance rate</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Always arrive 5 minutes early for your scheduled sessions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Ask for reviews after your sessions to boost your profile visibility</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Add detailed course descriptions to attract more learners</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Sessions & Reviews */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ListChecks className="h-5 w-5 mr-2 text-primary" />
                    Pending Requests
                  </CardTitle>
                  <CardDescription>
                    Session requests requiring your approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pendingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No pending session requests</p>
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
                </CardContent>
              </Card>
              
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Upcoming Sessions
                  </CardTitle>
                  <CardDescription>
                    Your scheduled tutoring sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : upcomingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No upcoming sessions scheduled</p>
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Star className="h-5 w-5 mr-2 text-primary" />
                    Recent Reviews
                  </CardTitle>
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
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Star className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.slice(0, 3).map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                      {reviews.length > 3 && (
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
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <Card>
                <CardHeader className="pb-2">
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
                    
                    <TabsContent value="upcoming" className="mt-4">
                      <ScrollArea className="h-[500px]">
                        {isLoadingSessions ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : upcomingSessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                            <p>No upcoming sessions scheduled</p>
                          </div>
                        ) : (
                          <div className="space-y-4 p-1">
                            {upcomingSessions.map((session) => (
                              <SessionCard 
                                key={session.id} 
                                session={session} 
                                onStatusChange={refetchSessions}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="pending" className="mt-4">
                      <ScrollArea className="h-[500px]">
                        {isLoadingSessions ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : pendingSessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                            <p>No pending session requests</p>
                          </div>
                        ) : (
                          <div className="space-y-4 p-1">
                            {pendingSessions.map((session) => (
                              <SessionCard 
                                key={session.id} 
                                session={session} 
                                onStatusChange={refetchSessions}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="completed" className="mt-4">
                      <ScrollArea className="h-[500px]">
                        {isLoadingSessions ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : completedSessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <CheckCircle className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                            <p>No completed sessions yet</p>
                          </div>
                        ) : (
                          <div className="space-y-4 p-1">
                            {completedSessions.map((session) => (
                              <SessionCard 
                                key={session.id} 
                                session={session} 
                                onStatusChange={refetchSessions}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="cancelled" className="mt-4">
                      <ScrollArea className="h-[500px]">
                        {isLoadingSessions ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : cancelledSessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                            <p>No cancelled sessions</p>
                          </div>
                        ) : (
                          <div className="space-y-4 p-1">
                            {cancelledSessions.map((session) => (
                              <SessionCard 
                                key={session.id} 
                                session={session} 
                                onStatusChange={refetchSessions}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>My Reviews</CardTitle>
                      <CardDescription>
                        Feedback from your students
                      </CardDescription>
                    </div>
                    <div className="flex items-center bg-primary-50 rounded-full px-3 py-1">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium">
                        {reviews.length > 0 
                          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
                          : "N/A"}
                      </span>
                      <span className="text-gray-500 ml-1">({reviews.length})</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Star className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No reviews yet</p>
                      <p className="text-sm mt-2">Encourage your students to leave reviews after sessions</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4 p-1">
                        {reviews.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>
                    Connect with your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <MessageSquare className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p>Messaging feature coming soon!</p>
                    <p className="text-sm mt-2">You'll be able to chat with your students directly in this tab</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <EditProfileDialog 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        refetchUser={refetchUser}
      />
      
      <AddCourseDialog
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        tutorId={user.id}
      />
    </>
  );
};

export default TutorDashboard;