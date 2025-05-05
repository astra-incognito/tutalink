import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, DollarSign, Home, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SessionWithDetails } from "@shared/schema";
import useAuth from "@/hooks/use-auth";

interface SessionCardProps {
  session: SessionWithDetails;
  onStatusChange?: () => void;
}

const SessionCard = ({ session, onStatusChange }: SessionCardProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/sessions/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session status updated successfully",
      });
      if (onStatusChange) {
        onStatusChange();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: session.id, status });
  };

  // Determine if the current user is the tutor or learner
  const isTutor = user?.id === session.tutorId;
  const otherPerson = isTutor ? session.learner : session.tutor;

  return (
    <Card className="mb-4 hover:bg-gray-50 transition">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://github.com/shadcn.png" alt={otherPerson.fullName} />
                <AvatarFallback>{getInitials(otherPerson.fullName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {otherPerson.fullName}
              </div>
              <div className="text-sm text-gray-500">
                {session.course.title} ({session.course.code})
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Badge className={getStatusColor(session.status)}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </Badge>
            <div className="mt-1 text-sm text-gray-500">
              {format(new Date(session.scheduleDate), "EEEE, MMM d, yyyy")}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(session.scheduleDate), "h:mm a")} - 
              {format(new Date(new Date(session.scheduleDate).getTime() + session.duration * 60000), "h:mm a")}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 border-t pt-4">
            <div className="sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">
                  <Home className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {session.location}
                </p>
                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                  <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {session.duration} minutes
                </p>
              </div>
              {session.price && (
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <DollarSign className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  <span>${session.price.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            {session.notes && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-900">Notes:</h4>
                <p className="mt-1 text-sm text-gray-500">{session.notes}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex items-center space-x-3">
          {/* Action buttons based on role and session status */}
          {isTutor && session.status === "pending" && (
            <>
              <Button 
                size="sm" 
                onClick={() => handleStatusChange("accepted")}
                disabled={updateStatus.isPending}
              >
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStatusChange("rejected")}
                disabled={updateStatus.isPending}
              >
                Decline
              </Button>
            </>
          )}
          
          {session.status === "accepted" && (
            <Button 
              size="sm" 
              variant={isTutor ? "default" : "outline"} 
              onClick={() => handleStatusChange("completed")}
              disabled={updateStatus.isPending}
            >
              Mark Completed
            </Button>
          )}
          
          {(session.status === "pending" || session.status === "accepted") && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleStatusChange("cancelled")}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show Less" : "Show More"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionCard;
