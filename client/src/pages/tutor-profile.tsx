import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  DollarSign, 
  Award, 
  Briefcase, 
  ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import BookingForm from "@/components/booking-form";
import ReviewCard from "@/components/review-card";
import useAuth from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { format } from "date-fns";
import { Link } from "wouter";
import { UserWithDetails, ReviewWithDetails } from "@shared/schema";

const formatDayOfWeek = (day: number) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
};

const TutorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { trackActivity } = useAnalytics();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const numericId = parseInt(id);

  // Fetch tutor details
  const {
    data: tutor,
    isLoading: isLoadingTutor,
    error: tutorError,
  } = useQuery<UserWithDetails>({
    queryKey: [`/api/tutors/${id}`],
    enabled: !isNaN(numericId),
  });
  
  // Track full profile view
  useEffect(() => {
    if (tutor && !isLoadingTutor) {
      trackActivity('view_full_profile', tutor.id, 'tutor', {
        tutorName: tutor.fullName,
        department: tutor.department,
        yearOfStudy: tutor.yearOfStudy,
        hasReviews: (tutor.reviewCount || 0) > 0,
        rating: tutor.averageRating || 0,
        hasPaidCourses: tutor.courses?.some(c => c.isPaid) || false,
        courseCount: tutor.courses?.length || 0
      });
    }
  }, [tutor, isLoadingTutor, trackActivity]);

  // Fetch tutor reviews
  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
  } = useQuery<ReviewWithDetails[]>({
    queryKey: [`/api/tutors/${id}/reviews`],
    enabled: !isNaN(numericId),
  });

  if (isNaN(numericId)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Invalid tutor ID</h1>
        <Button onClick={() => navigate("/find-tutors")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tutors
        </Button>
      </div>
    );
  }

  if (isLoadingTutor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tutorError || !tutor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Tutor not found</h1>
        <p className="mt-2 text-gray-600">The tutor you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/find-tutors")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tutors
        </Button>
      </div>
    );
  }

  // Group availabilities by day of week
  const availabilitiesByDay = tutor.availability?.reduce<Record<string, {startTime: string, endTime: string}[]>>(
    (acc, slot) => {
      const day = formatDayOfWeek(slot.dayOfWeek);
      if (!acc[day]) acc[day] = [];
      acc[day].push({
        startTime: slot.startTime,
        endTime: slot.endTime
      });
      return acc;
    },
    {}
  ) || {};

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Handle booking button click
  const handleBookSession = () => {
    if (!isAuthenticated) {
      trackActivity('booking_auth_redirect', tutor.id, 'tutor', { 
        tutorName: tutor.fullName,
        department: tutor.department
      });
      navigate("/login");
      return;
    }
    
    // Can't book yourself
    if (user?.id === tutor.id) {
      return;
    }
    
    // Track booking initiation
    trackActivity('initiate_booking', tutor.id, 'tutor', {
      tutorName: tutor.fullName,
      department: tutor.department,
      isPaid: tutor.courses?.some(c => c.isPaid) || false,
      hasCourseMatch: user?.department === tutor.department
    });
    
    setShowBookingForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/find-tutors")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to tutors
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tutor Info */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="flex-shrink-0 mb-4 md:mb-0">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="https://github.com/shadcn.png" alt={tutor.fullName} />
                    <AvatarFallback className="text-lg">{getInitials(tutor.fullName)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="md:ml-6 flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">{tutor.fullName}</h1>
                  <div className="flex items-center mt-1">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <span className="ml-1 text-gray-700">
                      {tutor.averageRating ? tutor.averageRating.toFixed(1) : "New"}
                    </span>
                    {tutor.reviewCount ? (
                      <span className="ml-1 text-gray-500">({tutor.reviewCount} reviews)</span>
                    ) : null}
                    <span className="mx-2 text-gray-300">|</span>
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="ml-1 text-gray-700">{tutor.department}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <Award className="h-4 w-4 text-gray-500" />
                    <span className="ml-1 text-gray-700">Year {tutor.yearOfStudy}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <Badge className="bg-primary-100 text-primary-800 hover:bg-primary-100">
                      GPA: {tutor.gpa?.toFixed(1)}
                    </Badge>
                    {user?.id === tutor.id && (
                      <Badge variant="outline" className="ml-2">
                        This is you
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
                <p className="text-gray-700">{tutor.bio}</p>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Courses</h2>
                <div className="flex flex-wrap gap-2">
                  {tutor.courses?.map((course) => (
                    <Badge
                      key={course.id}
                      variant="outline"
                      className={`flex items-center ${
                        course.isPaid 
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {course.course.title} ({course.course.code})
                      {course.isPaid && (
                        <span className="ml-1 text-xs">
                          - ${course.hourlyRate}/hr
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="availability" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="availability" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Availability</h2>
                  
                  {Object.keys(availabilitiesByDay).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No availability information provided
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(availabilitiesByDay).map(([day, slots]) => (
                        <div key={day} className="border rounded-md p-4">
                          <h3 className="font-medium text-gray-900 mb-2">{day}</h3>
                          <ul className="space-y-2">
                            {slots.map((slot, idx) => (
                              <li key={idx} className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                {slot.startTime} - {slot.endTime}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Reviews {reviews.length > 0 && `(${reviews.length})`}
                  </h2>
                  
                  {isLoadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
          </Tabs>
        </div>

        {/* Right Column - Booking & Info */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900">Pricing</h3>
                    <p className="text-gray-600">
                      {tutor.courses?.some(c => c.isPaid) ? (
                        <>
                          From ${Math.min(...tutor.courses.filter(c => c.isPaid).map(c => c.hourlyRate || 0))}/hour
                          {tutor.courses.some(c => !c.isPaid) && " (Some courses offered for free)"}
                        </>
                      ) : (
                        "All sessions offered for free"
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900">Session Format</h3>
                    <p className="text-gray-600">Virtual or in-person</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900">Session Length</h3>
                    <p className="text-gray-600">Typically 60 minutes</p>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                onClick={handleBookSession}
                disabled={user?.id === tutor.id}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {user?.id === tutor.id ? "Cannot book yourself" : "Book a Session"}
              </Button>
              
              {!isAuthenticated && (
                <p className="text-sm text-center mt-2 text-gray-500">
                  <Link href="/login">
                    <a className="text-primary hover:underline">Sign in</a>
                  </Link> to book a session
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Booking Form */}
          {showBookingForm && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Book a Session</h2>
                <BookingForm 
                  tutor={tutor} 
                  onSuccess={() => setShowBookingForm(false)} 
                  onCancel={() => setShowBookingForm(false)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;
