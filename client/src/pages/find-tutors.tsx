import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import TutorCard from "@/components/tutor-card";
import CourseFilter from "@/components/course-filter";
import DepartmentFilter from "@/components/department-filter";
import PriceFilter from "@/components/price-filter";
import { UserWithDetails, Course } from "@shared/schema";
import useAuth from "@/hooks/use-auth";

const FindTutors = () => {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isPaidOnly, setIsPaidOnly] = useState<boolean | null>(null);
  const [minGpa, setMinGpa] = useState<number | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  // Fetch all courses for filtering
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Construct query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCourse) params.append("courseId", selectedCourse.toString());
    if (selectedDepartment) params.append("department", selectedDepartment);
    if (isPaidOnly !== null) params.append("isPaid", isPaidOnly.toString());
    if (minGpa !== null) params.append("minGpa", minGpa.toString());
    
    return params.toString();
  };

  // Fetch tutors with filters
  const {
    data: tutors = [],
    isLoading,
    refetch,
  } = useQuery<UserWithDetails[]>({
    queryKey: [`/api/tutors?${buildQueryParams()}`],
  });

  // Apply filters and refetch data
  useEffect(() => {
    refetch();
  }, [selectedCourse, selectedDepartment, isPaidOnly, minGpa, refetch]);

  // Filter by search term
  const filteredTutors = tutors.filter(tutor => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullNameMatch = tutor.fullName.toLowerCase().includes(searchLower);
    const departmentMatch = tutor.department.toLowerCase().includes(searchLower);
    const courseMatch = tutor.courses?.some(
      tc => tc.course.title.toLowerCase().includes(searchLower) || 
            tc.course.code.toLowerCase().includes(searchLower)
    );
    
    return fullNameMatch || departmentMatch || courseMatch;
  });

  const handleResetFilters = () => {
    setSelectedCourse(null);
    setSelectedDepartment(null);
    setIsPaidOnly(null);
    setMinGpa(null);
    setSearchTerm("");
  };

  const handleFilterClose = () => {
    setIsFilterSheetOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Find Tutors</h1>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by name, course..."
              className="pl-10 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filters Button (Mobile) */}
          <div className="block sm:hidden">
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Tutors</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-4">
                  <CourseFilter
                    courses={courses}
                    selectedCourse={selectedCourse}
                    onChange={setSelectedCourse}
                  />
                  <Separator />
                  <DepartmentFilter
                    courses={courses}
                    selectedDepartment={selectedDepartment}
                    onChange={setSelectedDepartment}
                  />
                  <Separator />
                  <PriceFilter
                    isPaidOnly={isPaidOnly}
                    onChangePaidStatus={setIsPaidOnly}
                    minGpa={minGpa}
                    onChangeMinGpa={setMinGpa}
                  />
                  <div className="flex justify-between pt-4 mt-4 border-t">
                    <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
                    <Button onClick={handleFilterClose}>Apply</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row">
        {/* Filters (Desktop) */}
        <div className="hidden sm:block w-full md:w-64 mr-8 flex-shrink-0">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
            
            <div className="space-y-6">
              <CourseFilter
                courses={courses}
                selectedCourse={selectedCourse}
                onChange={setSelectedCourse}
              />
              <Separator />
              <DepartmentFilter
                courses={courses}
                selectedDepartment={selectedDepartment}
                onChange={setSelectedDepartment}
              />
              <Separator />
              <PriceFilter
                isPaidOnly={isPaidOnly}
                onChangePaidStatus={setIsPaidOnly}
                minGpa={minGpa}
                onChangeMinGpa={setMinGpa}
              />
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tutors List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tutors found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCourse || selectedDepartment || isPaidOnly !== null
                  ? "Try adjusting your filters or search terms."
                  : "No tutors are available at the moment."}
              </p>
              <Button onClick={handleResetFilters}>Reset Filters</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Found {filteredTutors.length} {filteredTutors.length === 1 ? "tutor" : "tutors"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTutors.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindTutors;
