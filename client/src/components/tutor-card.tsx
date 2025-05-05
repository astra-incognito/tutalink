import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, DollarSign, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserWithDetails } from "@shared/schema";
import { useAnalytics } from "@/hooks/use-analytics";

interface TutorCardProps {
  tutor: UserWithDetails;
}

const TutorCard = ({ tutor }: TutorCardProps) => {
  const { trackActivity, trackSearchQuery } = useAnalytics();
  
  // Calculate first letter of first and last name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Check if tutor is available now (simplified)
  const isAvailableNow = tutor.availability && tutor.availability.length > 0;

  // Get all courses taught by the tutor
  const courses = tutor.courses || [];
  
  // Track tutor profile views
  const handleProfileClick = () => {
    trackActivity('view_tutor_profile', tutor.id, 'tutor', {
      tutorName: tutor.fullName,
      department: tutor.department,
      courseCount: courses.length,
      hasAvailability: isAvailableNow,
      rating: tutor.averageRating
    });
  };

  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            <Avatar className="h-12 w-12">
              <AvatarImage src="https://github.com/shadcn.png" alt={tutor.fullName} />
              <AvatarFallback>{getInitials(tutor.fullName)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{tutor.fullName}</h3>
            <div className="flex items-center">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="ml-1 text-sm text-gray-500">
                {tutor.averageRating?.toFixed(1) || "New"}
              </span>
              <span className="mx-1 text-gray-500">·</span>
              <span className="text-sm text-gray-500">
                {tutor.reviewCount || 0} reviews
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              {tutor.department}, Year {tutor.yearOfStudy}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              {courses.some((c) => c.isPaid)
                ? `${Math.min(...courses.filter(c => c.isPaid).map(c => c.hourlyRate || 0))}/hour`
                : "Free"}
            </span>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500 overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {tutor.bio || "No bio provided"}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {courses.slice(0, 3).map((tutorCourse) => (
              <Badge
                key={tutorCourse.id}
                variant="outline"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                {tutorCourse.course.title}
              </Badge>
            ))}
            {courses.length > 3 && (
              <Badge
                variant="outline"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                +{courses.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <Badge
            variant="outline"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAvailableNow
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <span
              className={`h-2 w-2 mr-1 rounded-full ${
                isAvailableNow ? "bg-green-500" : "bg-gray-500"
              }`}
            ></span>
            {isAvailableNow ? "Available now" : "Not available"}
          </Badge>
          <Link href={`/tutors/${tutor.id}`} onClick={handleProfileClick}>
            <Button size="sm">View Profile</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default TutorCard;
