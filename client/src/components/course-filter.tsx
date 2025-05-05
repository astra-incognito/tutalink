import {
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Course } from "@shared/schema";

interface CourseFilterProps {
  courses: Course[];
  selectedCourse: number | null;
  onChange: (courseId: number | null) => void;
}

const CourseFilter = ({ courses, selectedCourse, onChange }: CourseFilterProps) => {
  const handleCourseChange = (value: string) => {
    if (value === "all") {
      onChange(null);
    } else {
      onChange(parseInt(value));
    }
  };

  return (
    <FormItem>
      <FormLabel>Course</FormLabel>
      <Select
        value={selectedCourse?.toString() || "all"}
        onValueChange={handleCourseChange}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id.toString()}>
              {course.title} ({course.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  );
};

export default CourseFilter;
