import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, DollarSign, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import useAuth from "@/hooks/use-auth";
import { UserWithDetails } from "@shared/schema";

// Schema for booking form validation
const bookingSchema = z.object({
  tutorId: z.number(),
  courseId: z.number(),
  scheduleDate: z.date(),
  duration: z.number().min(30).max(180),
  location: z.string().min(3, "Location must be at least 3 characters"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  tutor: UserWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

const BookingForm = ({ tutor, onSuccess, onCancel }: BookingFormProps) => {
  const { toast } = useToast();
  const { trackActivity } = useAnalytics();
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  // Track booking form opened
  useEffect(() => {
    trackActivity('booking_form_opened', tutor.id, 'tutor', {
      tutorName: tutor.fullName,
      department: tutor.department,
      hasPaidCourses: tutor.courses?.some(c => c.isPaid) || false,
      courseCount: tutor.courses?.length || 0
    });
  }, [trackActivity, tutor]);
  
  // Set default values for the form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      tutorId: tutor.id,
      scheduleDate: new Date(),
      duration: 60,
      location: "Virtual",
      notes: "",
    },
  });

  // Ensure scheduleDate is always a Date object
  useEffect(() => {
    const value = form.getValues("scheduleDate");
    if (typeof value === "string") {
      form.setValue("scheduleDate", new Date(value));
    }
  }, []);

  // Handle course selection and update form
  const handleCourseChange = (courseId: string) => {
    // Check if courseId is our "no-courses" special value
    if (courseId === "no-courses") {
      return;
    }
    
    const numericId = parseInt(courseId);
    
    if (isNaN(numericId)) {
      console.error("Invalid course ID:", courseId);
      return;
    }
    
    const course = tutor.courses?.find(c => c.courseId === numericId);
    
    if (!course) {
      console.error("Course not found for ID:", numericId);
      return;
    }
    
    setSelectedCourse(course);
    form.setValue("courseId", numericId);
    
    // Track course selection
    trackActivity('booking_course_selected', tutor.id, 'tutor', {
      tutorName: tutor.fullName || 'Unknown',
      courseName: course.course?.title || 'Unknown',
      courseCode: course.course?.code || 'Unknown',
      department: course.course?.department || 'Unknown',
      isPaid: course.isPaid || false,
      hourlyRate: course.hourlyRate || 0
    });
  };

  // Create session mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      // Format the date properly for the API
      const formattedDate = data.scheduleDate.toISOString();
      
      // Add price if this is a paid course
      const sessionData = {
        ...data,
        scheduleDate: formattedDate, // Use the properly formatted date string
        price: selectedCourse?.isPaid ? selectedCourse.hourlyRate * (data.duration / 60) : null,
        isPaid: selectedCourse?.isPaid || false,
      };
      
      const res = await apiRequest("POST", "/api/sessions", sessionData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Track successful booking
      trackActivity('booking_completed', tutor.id, 'tutor', {
        tutorName: tutor.fullName,
        courseName: selectedCourse?.course?.title || '',
        courseCode: selectedCourse?.course?.code || '',
        duration: form.getValues('duration'),
        location: form.getValues('location'),
        isPaid: selectedCourse?.isPaid || false,
        price: selectedCourse?.isPaid ? selectedCourse.hourlyRate * (form.getValues('duration') / 60) : 0,
        sessionId: data.id
      });
      
      toast({
        title: "Session Booked",
        description: "Your session request has been sent to the tutor",
      });
      onSuccess();
    },
    onError: (error: any) => {
      // Track booking error
      trackActivity('booking_error', tutor.id, 'tutor', {
        tutorName: tutor.fullName,
        courseName: selectedCourse?.course?.title || '',
        error: error.message || "Unknown error",
        isPaid: selectedCourse?.isPaid || false
      });
      
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error booking your session",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    // Track booking submission attempt
    trackActivity('booking_submitted', tutor.id, 'tutor', {
      tutorName: tutor.fullName,
      courseId: data.courseId,
      courseName: selectedCourse?.course?.title || '',
      duration: data.duration,
      location: data.location,
      hasNotes: data.notes && data.notes.length > 0,
      isPaid: selectedCourse?.isPaid || false
    });
    
    mutate(data);
  };
  
  // Handle cancellation
  const handleCancel = () => {
    // Track cancellation
    trackActivity('booking_cancelled', tutor.id, 'tutor', {
      tutorName: tutor.fullName,
      courseSelected: !!selectedCourse,
      isPaid: selectedCourse?.isPaid || false,
      formProgress: form.formState.dirtyFields ? Object.keys(form.formState.dirtyFields).length : 0
    });
    
    onCancel();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select
                onValueChange={handleCourseChange}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {!tutor.courses || tutor.courses.length === 0 ? (
                    <SelectItem value="no-courses" disabled>
                      No courses available for this tutor
                    </SelectItem>
                  ) : (
                    tutor.courses.map((course) => (
                      <SelectItem 
                        key={course.courseId} 
                        value={course.courseId.toString()}
                      >
                        {course.course?.title || 'Unknown'} ({course.course?.code || 'N/A'})
                        {course.isPaid && ` - $${course.hourlyRate}/hr`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="scheduleDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) field.onChange(date);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Virtual or physical location" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Enter "Virtual" for online sessions or specify a meeting location.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any specific topics or questions you'd like to cover"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedCourse?.isPaid && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="font-medium">Price Estimate</h3>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              <p>Rate: ${selectedCourse.hourlyRate}/hour</p>
              <p>Duration: {form.watch("duration")} minutes</p>
              <p className="mt-1 font-medium text-gray-900">
                Total: ${(selectedCourse.hourlyRate * (form.watch("duration") / 60)).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {(!tutor.courses || tutor.courses.length === 0) && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <p>This tutor doesn't have any courses available yet. Please check back later or contact the tutor.</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isPending || !tutor.courses || tutor.courses.length === 0 || !selectedCourse}
          >
            {isPending ? "Requesting..." : "Request Session"}
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BookingForm;
