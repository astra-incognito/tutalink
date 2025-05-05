import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { Course } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

// Extended schema for tutor-specific validation
const tutorSchema = registerSchema
  .extend({
    gpa: z.number().min(3.5, "Tutors must have a GPA of at least 3.5"),
    bio: z.string().min(20, "Please provide a bio of at least 20 characters"),
    courses: z.array(z.number()).nonempty("Please select at least one course"),
    availabilities: z.array(
      z.object({
        dayOfWeek: z.number(),
        startTime: z.string(),
        endTime: z.string(),
      })
    ),
    coursePaid: z.record(z.string(), z.boolean()),
    courseRate: z.record(z.string(), z.number().optional()),
  })
  .refine(
    (data) => {
      // Ensure all paid courses have rates
      const paidCourses = Object.entries(data.coursePaid).filter(([_, isPaid]) => isPaid);
      return paidCourses.every(([courseId, _]) => 
        data.courseRate[courseId] && data.courseRate[courseId]! > 0
      );
    },
    {
      message: "All paid courses must have an hourly rate",
      path: ["courseRate"],
    }
  );

type TutorFormValues = z.infer<typeof tutorSchema>;

interface TutorFormProps {
  onSubmit: (data: any) => void;
}

const TutorForm = ({ onSubmit }: TutorFormProps) => {
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  
  // Fetch departments and courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Group courses by department
  const coursesByDepartment = courses.reduce<Record<string, Course[]>>(
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

  // Default form values
  const defaultValues: Partial<TutorFormValues> = {
    role: "tutor",
    courses: [],
    availabilities: [],
    coursePaid: {},
    courseRate: {},
  };

  const form = useForm<TutorFormValues>({
    resolver: zodResolver(tutorSchema),
    defaultValues,
    mode: "onBlur",
  });

  // Update course-related fields when selected courses change
  useEffect(() => {
    const coursePaid = { ...form.getValues().coursePaid };
    const courseRate = { ...form.getValues().courseRate };
    
    // Initialize new courses
    selectedCourses.forEach(courseId => {
      if (coursePaid[courseId.toString()] === undefined) {
        coursePaid[courseId.toString()] = false;
      }
    });
    
    // Remove unselected courses
    Object.keys(coursePaid).forEach(courseIdStr => {
      const courseId = parseInt(courseIdStr);
      if (!selectedCourses.includes(courseId)) {
        delete coursePaid[courseIdStr];
        delete courseRate[courseIdStr];
      }
    });
    
    form.setValue("coursePaid", coursePaid);
    form.setValue("courseRate", courseRate);
    form.setValue("courses", selectedCourses);
  }, [selectedCourses, form]);

  const handleSubmit = (data: TutorFormValues) => {
    // Transform data for API
    const tutorCoursesData = selectedCourses.map(courseId => ({
      courseId,
      isPaid: data.coursePaid[courseId.toString()],
      hourlyRate: data.coursePaid[courseId.toString()] ? data.courseRate[courseId.toString()] : null,
    }));
    
    const userData = {
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      email: data.email,
      department: data.department,
      yearOfStudy: data.yearOfStudy,
      role: data.role,
      gpa: data.gpa,
      showGPA: true, // Tutors must always show their GPA
      bio: data.bio,
      tutorCourses: tutorCoursesData,
      availabilities: data.availabilities,
    };
    
    onSubmit(userData);
  };

  const handleCourseToggle = (courseId: number, checked: boolean) => {
    if (checked) {
      setSelectedCourses([...selectedCourses, courseId]);
    } else {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a username"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Create a password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your full name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearOfStudy"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Year of Study</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gpa"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>GPA (out of 4.0)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    placeholder="Your GPA"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <p className="text-xs text-gray-500">Minimum GPA required: 3.5</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="sm:col-span-6">
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write a brief description of your tutoring experience and expertise"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-gray-500">Write a brief description of your tutoring experience and expertise.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-6">
            <FormLabel>Courses You Can Teach</FormLabel>
            <Card className="mt-2">
              <CardContent className="pt-6">
                {departments.map((dept) => (
                  <div key={dept} className="mb-4">
                    <h4 className="font-medium text-sm mb-2">{dept}</h4>
                    <div className="space-y-2">
                      {coursesByDepartment[dept].map((course) => (
                        <div key={course.id} className="flex items-center">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={(checked) => handleCourseToggle(course.id, checked as boolean)}
                          />
                          <label
                            htmlFor={`course-${course.id}`}
                            className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {course.title} ({course.code})
                          </label>
                          
                          {selectedCourses.includes(course.id) && (
                            <div className="flex items-center ml-4 space-x-2">
                              <Controller
                                control={form.control}
                                name={`coursePaid.${course.id}`}
                                defaultValue={false}
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      id={`paid-${course.id}`}
                                    />
                                    <label
                                      htmlFor={`paid-${course.id}`}
                                      className="text-sm font-medium"
                                    >
                                      Paid
                                    </label>
                                  </div>
                                )}
                              />
                              
                              {form.watch(`coursePaid.${course.id}`) && (
                                <Controller
                                  control={form.control}
                                  name={`courseRate.${course.id}`}
                                  defaultValue={0}
                                  render={({ field }) => (
                                    <div className="flex items-center">
                                      <span className="text-sm mx-2">$</span>
                                      <Input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        placeholder="$/hour"
                                        className="w-20 h-8"
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                      />
                                      <span className="text-sm ml-1">/hr</span>
                                    </div>
                                  )}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {form.formState.errors.courses && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.courses.message}
                  </p>
                )}
                {form.formState.errors.courseRate && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.courseRate.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="sm:col-span-6">
            <FormLabel>Availability</FormLabel>
            <Card className="mt-2">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 mb-4">
                  Set your availability by adding time slots. You can always update these later.
                </p>
                <Controller
                  control={form.control}
                  name="availabilities"
                  render={({ field }) => (
                    <div className="space-y-4">
                      {field.value.map((availability, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <Select
                            value={availability.dayOfWeek.toString()}
                            onValueChange={(value) => {
                              const newAvailabilities = [...field.value];
                              newAvailabilities[index].dayOfWeek = parseInt(value);
                              field.onChange(newAvailabilities);
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <span className="text-sm">From</span>
                          <Input
                            type="time"
                            className="w-32"
                            value={availability.startTime}
                            onChange={(e) => {
                              const newAvailabilities = [...field.value];
                              newAvailabilities[index].startTime = e.target.value;
                              field.onChange(newAvailabilities);
                            }}
                          />
                          
                          <span className="text-sm">To</span>
                          <Input
                            type="time"
                            className="w-32"
                            value={availability.endTime}
                            onChange={(e) => {
                              const newAvailabilities = [...field.value];
                              newAvailabilities[index].endTime = e.target.value;
                              field.onChange(newAvailabilities);
                            }}
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newAvailabilities = field.value.filter(
                                (_, i) => i !== index
                              );
                              field.onChange(newAvailabilities);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          field.onChange([
                            ...field.value,
                            { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
                          ]);
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Availability
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="mr-3">
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Register as Tutor
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default TutorForm;
