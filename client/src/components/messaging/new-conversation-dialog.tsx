import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface User {
  id: number;
  fullName: string;
  username: string;
  role: string;
}

interface NewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (participantIds: number[], title?: string) => void;
  isCreating: boolean;
}

export function NewConversationDialog({
  isOpen,
  onClose,
  onCreateConversation,
  isCreating,
}: NewConversationDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Fetch users based on selected role
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users", selectedRole],
    queryFn: async () => {
      let url = "/api/users";
      if (selectedRole) {
        url += `?role=${selectedRole}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return await res.json();
    },
    enabled: isOpen, // Only fetch when dialog is open
  });

  const handleToggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateConversation = () => {
    if (selectedUsers.length === 0) return;
    onCreateConversation(selectedUsers, title || undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a conversation with one or more users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Conversation Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Enter a title for this conversation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Filter by Role</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role to filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="tutor">Tutors</SelectItem>
                <SelectItem value="learner">Learners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Recipients</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">Failed to load users</p>
            ) : users?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users found</p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                {users
                  ?.filter((u: User) => u.id !== user?.id)
                  .map((u: User) => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${u.id}`}
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={() => handleToggleUser(u.id)}
                      />
                      <Label
                        htmlFor={`user-${u.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {u.fullName} ({u.role})
                      </Label>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}