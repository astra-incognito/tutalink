import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Course, TutorCourse } from "@shared/schema";

interface AddCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tutorId: number;
}

interface NewCourse {
  courseId: number;
  isPaid: boolean;
  hourlyRate: number | null;
}

const AddCourseDialog = ({ isOpen, onClose, tutorId }: AddCourseDialogProps) => {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);

  // Fetch all courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Fetch tutor's existing courses to filter them out
  const { data: tutorCourses = [] } = useQuery<(TutorCourse & { course: Course })[]>({
    queryKey: [`/api/tutors/${tutorId}/courses`],
  });

  // Filter out courses that the tutor already teaches
  const availableCourses = courses.filter(
    (course) => !tutorCourses.some((tc) => tc.courseId === course.id)
  );

  // Group courses by department
  const coursesByDepartment = availableCourses.reduce<Record<string, Course[]>>(
    (acc, course) => {
      if (!acc[course.department]) {
        acc[course.department] = [];
      }
      acc[course.department].push(course);
      return acc;
    },
    {}
  );

  const departments = Object.keys(coursesByDepartment);

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async (newCourse: NewCourse) => {
      const res = await apiRequest("POST", `/api/tutor/courses`, newCourse);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate tutor courses data
      queryClient.invalidateQueries({ queryKey: [`/api/tutors/${tutorId}/courses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tutors/${tutorId}`] });
      
      toast({
        title: "Course added successfully",
        description: "The course has been added to your profile.",
      });
      
      // Reset form and close dialog
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add course",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedCourse(null);
    setIsPaid(false);
    setHourlyRate(null);
  };

  // Reset form when dialog is opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!selectedCourse) return;

    const newCourse: NewCourse = {
      courseId: selectedCourse,
      isPaid,
      hourlyRate: isPaid ? hourlyRate : null,
    };

    // Validate hourly rate if course is paid
    if (isPaid && (!hourlyRate || hourlyRate <= 0)) {
      toast({
        title: "Invalid hourly rate",
        description: "Please enter a valid hourly rate greater than 0.",
        variant: "destructive",
      });
      return;
    }

    addCourseMutation.mutate(newCourse);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Add a new course that you can tutor students in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {availableCourses.length === 0 ? (
            <div className="text-center p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                You're already teaching all available courses!
              </p>
            </div>
          ) : (
            <>
              {/* Course Selection */}
              <div className="grid gap-2">
                <Label htmlFor="course">Select Course</Label>
                <Select
                  value={selectedCourse?.toString() || ""}
                  onValueChange={(value) => setSelectedCourse(parseInt(value))}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select a course to teach" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <div key={dept}>
                        <div className="px-2 py-1.5 text-sm font-semibold">{dept}</div>
                        {coursesByDepartment[dept].map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title} ({course.code})
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Paid Course Option */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="paid-course"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
                <Label htmlFor="paid-course">Paid Tutoring</Label>
              </div>

              {/* Hourly Rate (if paid) */}
              {isPaid && (
                <div className="grid gap-2">
                  <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
                  <div className="flex items-center">
                    <span className="mr-1">$</span>
                    <Input
                      id="hourly-rate"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="25.00"
                      value={hourlyRate || ""}
                      onChange={(e) => setHourlyRate(e.target.value ? parseFloat(e.target.value) : null)}
                      className="max-w-[120px]"
                    />
                    <span className="ml-1">/hour</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              addCourseMutation.isPending ||
              !selectedCourse ||
              (isPaid && (!hourlyRate || hourlyRate <= 0)) ||
              availableCourses.length === 0
            }
          >
            {addCourseMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseDialog;