import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarIcon as StarIconSolid } from "lucide-react";
import { format } from "date-fns";
import { ReviewWithDetails } from "@shared/schema";

interface ReviewCardProps {
  review: ReviewWithDetails;
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="mb-4">
      <CardContent className="py-4 sm:py-5 sm:px-6">
        <div className="flex items-center mb-2">
          <div className="flex-shrink-0 h-10 w-10">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://github.com/shadcn.png" alt={review.learner.fullName} />
              <AvatarFallback>{getInitials(review.learner.fullName)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{review.learner.fullName}</p>
            <p className="text-sm text-gray-500">{review.course.title} ({review.course.code})</p>
          </div>
        </div>
        <div className="flex items-center mb-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <StarIconSolid
                key={i}
                className={`h-5 w-5 ${
                  i < review.rating ? "text-yellow-400" : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <p className="ml-2 text-sm text-gray-500">
            {format(new Date(review.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="mt-2 text-sm text-gray-700">
          <p>{review.comment}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
