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

interface DepartmentFilterProps {
  courses: Course[];
  selectedDepartment: string | null;
  onChange: (department: string | null) => void;
}

const DepartmentFilter = ({ courses, selectedDepartment, onChange }: DepartmentFilterProps) => {
  // Extract unique departments from courses
  const departments = Array.from(new Set(courses.map((course) => course.department))).sort();

  const handleDepartmentChange = (value: string) => {
    if (value === "all") {
      onChange(null);
    } else {
      onChange(value);
    }
  };

  return (
    <FormItem>
      <FormLabel>Department</FormLabel>
      <Select
        value={selectedDepartment || "all"}
        onValueChange={handleDepartmentChange}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department} value={department}>
              {department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  );
};

export default DepartmentFilter;
