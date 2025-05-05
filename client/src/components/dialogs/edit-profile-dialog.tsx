import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { User } from "@shared/schema";

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

interface ProfileUpdate {
  fullName?: string;
  email?: string;
  department?: string;
  yearOfStudy?: number;
  bio?: string;
  gpa?: number | null;
  showGPA?: boolean | null;
  profileImage?: string | null;
}

const EditProfileDialog = ({ isOpen, onClose, user }: EditProfileDialogProps) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(user.department);
  const [yearOfStudy, setYearOfStudy] = useState(user.yearOfStudy);
  const [bio, setBio] = useState(user.bio || "");
  const [gpa, setGpa] = useState<number | null>(user.gpa);
  const [showGPA, setShowGPA] = useState<boolean>(user.showGPA || false);
  const [profileImage, setProfileImage] = useState<string | null>(user.profileImage);

  // Update profile when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setDepartment(user.department);
      setYearOfStudy(user.yearOfStudy);
      setBio(user.bio || "");
      setGpa(user.gpa);
      setShowGPA(user.showGPA || false);
      setProfileImage(user.profileImage);
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileUpdate: ProfileUpdate) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, profileUpdate);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tutors/${user.id}`] });
      
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been updated.",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!fullName || !email || !department || yearOfStudy === undefined) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Validate GPA if provided
    if (gpa !== null && (gpa < 0 || gpa > 4)) {
      toast({
        title: "Invalid GPA",
        description: "GPA must be between 0 and 4.",
        variant: "destructive",
      });
      return;
    }

    // Create update object
    const profileUpdate: ProfileUpdate = {
      fullName,
      email,
      department,
      yearOfStudy,
      bio: bio || null,
      gpa,
      showGPA,
      profileImage,
    };

    updateProfileMutation.mutate(profileUpdate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Full Name */}
          <div className="grid gap-2">
            <Label htmlFor="full-name" className="required">Full Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email" className="required">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          {/* Department */}
          <div className="grid gap-2">
            <Label htmlFor="department" className="required">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
              required
            />
          </div>

          {/* Year of Study */}
          <div className="grid gap-2">
            <Label htmlFor="year-of-study" className="required">Year of Study</Label>
            <Input
              id="year-of-study"
              type="number"
              min="1"
              max="10"
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(parseInt(e.target.value))}
              required
            />
          </div>

          {/* GPA */}
          <div className="grid gap-2">
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              type="number"
              min="0"
              max="4"
              step="0.01"
              value={gpa !== null ? gpa : ""}
              onChange={(e) => setGpa(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 3.5"
            />
          </div>

          {/* Show GPA Option (for learners) */}
          {user.role === 'learner' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-gpa"
                checked={showGPA}
                onCheckedChange={setShowGPA}
              />
              <Label htmlFor="show-gpa">Make GPA visible to tutors</Label>
            </div>
          )}

          {/* Bio */}
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
            />
          </div>

          {/* Profile Image URL */}
          <div className="grid gap-2">
            <Label htmlFor="profile-image">Profile Image URL</Label>
            <Input
              id="profile-image"
              value={profileImage || ""}
              onChange={(e) => setProfileImage(e.target.value || null)}
              placeholder="URL to your profile image"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;