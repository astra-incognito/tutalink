import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EditProfileDialog from "@/components/dialogs/edit-profile-dialog";
import { useLocation } from "wouter";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  User as UserIcon, 
  Book, 
  Star, 
  Calendar, 
  Edit, 
  Plus, 
  Clock,
  CheckCircle,
  MessageSquare,
  Search,
  GraduationCap,
  Award,
  BarChart,
  ThumbsUp,
  FileText
} from "lucide-react";
import SessionCard from "@/components/session-card";
import { User, SessionWithDetails } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LearnerDashboardProps {
  user: User;
  refetchUser: () => void;
}

const LearnerDashboard = ({ user, refetchUser }: LearnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [, navigate] = useLocation();
  
  // Fetch sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/sessions"],
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

  // Get statistics 
  const uniqueTutors = new Set(sessions.map(s => s.tutorId)).size;
  const totalSpent = sessions.filter(s => s.status === "completed").reduce((sum, s) => sum + (s.price || 0), 0);
  const totalHours = sessions.filter(s => s.status === "completed").reduce((sum, s) => sum + s.duration, 0);
  const needsReviewSessions = sessions.filter(s => 
    s.status === "completed" && !s.review
  );

  return (
    <>
      {/* EditProfile Dialog */}
      <EditProfileDialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
      />
      
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
              <Badge className="ml-2 bg-blue-500">Learner</Badge>
            </div>
            <p className="text-sm font-medium text-gray-500">
              {user?.department} • Year {user?.yearOfStudy}
            </p>
            <div className="mt-1 flex items-center">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-primary mr-1" />
                <span>{sessions.length} total sessions</span>
              </div>
              <span className="mx-2 text-gray-300">•</span>
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 text-primary mr-1" />
                <span>{uniqueTutors} tutors met</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
          <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button onClick={() => navigate("/find-tutors")}>
            <Search className="mr-2 h-4 w-4" />
            Find Tutors
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Sidebar - Stats & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Learning stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <BarChart className="h-5 w-5 mr-2" />
                Learning Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Clock className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">{totalHours}</span>
                  <span className="text-xs text-gray-500">Hours Learned</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">${totalSpent}</span>
                  <span className="text-xs text-gray-500">Invested</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <UserIcon className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">{uniqueTutors}</span>
                  <span className="text-xs text-gray-500">Tutors</span>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary mb-2" />
                  <span className="text-2xl font-bold">{completedSessions.length}</span>
                  <span className="text-xs text-gray-500">Sessions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <FileText className="h-5 w-5 mr-2" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsReviewSessions.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex">
                      <ThumbsUp className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-sm">Review your completed sessions</h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          You have {needsReviewSessions.length} {needsReviewSessions.length === 1 ? 'session' : 'sessions'} to review
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {pendingSessions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex">
                      <Calendar className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-sm">Pending session requests</h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          You have {pendingSessions.length} pending {pendingSessions.length === 1 ? 'request' : 'requests'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {upcomingSessions.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex">
                      <Calendar className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-sm">Upcoming sessions</h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          You have {upcomingSessions.length} upcoming {upcomingSessions.length === 1 ? 'session' : 'sessions'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {needsReviewSessions.length === 0 && pendingSessions.length === 0 && upcomingSessions.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p>No pending action items!</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate("/find-tutors")}
                    >
                      <Search className="mr-1 h-3 w-3" />
                      Find tutors
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recommended Courses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-primary">
                <Award className="h-5 w-5 mr-2" />
                Popular Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition-colors cursor-pointer">
                  <h4 className="font-medium text-sm">Computer Science</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Data Structures, Algorithms, Web Development
                  </p>
                </div>
                <div className="bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition-colors cursor-pointer">
                  <h4 className="font-medium text-sm">Mathematics</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Calculus, Linear Algebra, Statistics
                  </p>
                </div>
                <div className="bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition-colors cursor-pointer">
                  <h4 className="font-medium text-sm">Physics</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Mechanics, Electricity & Magnetism
                  </p>
                </div>
                <div className="bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition-colors cursor-pointer">
                  <h4 className="font-medium text-sm">Chemistry</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Organic, Inorganic, Physical Chemistry
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-primary text-sm"
                  onClick={() => navigate("/find-tutors")}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Browse All Subjects
                </Button>
              </div>
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
              <TabsTrigger value="sessions">My Sessions</TabsTrigger>
              <TabsTrigger value="pending-reviews">Pending Reviews</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate("/find-tutors")}
                      >
                        <Search className="mr-1 h-3 w-3" />
                        Find tutors
                      </Button>
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
              
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    Pending Session Requests
                  </CardTitle>
                  <CardDescription>
                    Waiting for tutor approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pendingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
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
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ThumbsUp className="h-5 w-5 mr-2 text-primary" />
                    Sessions To Review
                  </CardTitle>
                  <CardDescription>
                    Share your feedback after completed sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : needsReviewSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <ThumbsUp className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No sessions to review</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {needsReviewSessions.slice(0, 3).map((session) => (
                        <SessionCard 
                          key={session.id} 
                          session={session} 
                          onStatusChange={refetchSessions}
                          showReviewButton
                        />
                      ))}
                      {needsReviewSessions.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => setActiveTab("pending-reviews")}
                        >
                          View all {needsReviewSessions.length} pending reviews
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
                    Track your learning journey
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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => navigate("/find-tutors")}
                            >
                              <Search className="mr-1 h-3 w-3" />
                              Find tutors
                            </Button>
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
                            <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
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
                                showReviewButton={!session.review}
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

            {/* Pending Reviews Tab */}
            <TabsContent value="pending-reviews">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Sessions To Review</CardTitle>
                  <CardDescription>
                    Help tutors by providing feedback on your sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : needsReviewSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <ThumbsUp className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p>No sessions need reviews!</p>
                      <p className="text-sm mt-1">All your completed sessions have been reviewed</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4 p-1">
                        {needsReviewSessions.map((session) => (
                          <SessionCard 
                            key={session.id} 
                            session={session} 
                            onStatusChange={refetchSessions}
                            showReviewButton
                          />
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
                    Connect with your tutors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <MessageSquare className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p>Messaging feature coming soon!</p>
                    <p className="text-sm mt-2">You'll be able to chat with your tutors directly in this tab</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default LearnerDashboard;