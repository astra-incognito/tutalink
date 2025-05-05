import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search, UserPlus, X, Edit, ChevronDown, ChevronUp, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPanel() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    email: "",
    department: "",
    role: "",
    password: ""
  });
  const [passwordChange, setPasswordChange] = useState({
    userId: 0,
    newPassword: ""
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Fetch users
  const { 
    data: users = [], 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    },
    enabled: user?.role === "admin"
  });

  // Fetch analytics
  const { 
    data: analytics = {
      userCount: 0,
      sessionCount: 0,
      activeUsers: 0,
      conversionRate: 0,
      topSearches: [],
      userGrowth: []
    }, 
    isLoading: isLoadingAnalytics
  } = useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics");
      return await res.json();
    },
    enabled: user?.role === "admin" && activeTab === "analytics"
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userData.id}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User information has been updated successfully",
      });
      setEditingUser(null);
      refetchUsers();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: {userId: number, newPassword: string}) => {
      const res = await apiRequest("POST", `/api/admin/users/${data.userId}/change-password`, {
        newPassword: data.newPassword
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "User password has been updated successfully",
      });
      setPasswordDialogOpen(false);
      setPasswordChange({
        userId: 0,
        newPassword: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter users based on search
  const filteredUsers = users.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.fullName.toLowerCase().includes(query) ||
      user.department.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      department: user.department,
      role: user.role,
      password: ""
    });
  };

  const handleUpdateUser = () => {
    updateUserMutation.mutate({
      id: editingUser.id,
      ...editForm
    });
  };

  const handleChangePassword = (userId: number) => {
    setPasswordChange({
      userId,
      newPassword: ""
    });
    setPasswordDialogOpen(true);
  };

  const handleSaveNewPassword = () => {
    if (passwordChange.newPassword.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate(passwordChange);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and view platform analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Platform Settings</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Users</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <CardDescription>
                Manage user accounts, roles, and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>{editingUser?.id === user.id ? (
                              <Input
                                value={editForm.username}
                                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                              />
                            ) : user.username}</TableCell>
                            <TableCell>{editingUser?.id === user.id ? (
                              <Input
                                value={editForm.fullName}
                                onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                              />
                            ) : user.fullName}</TableCell>
                            <TableCell>{editingUser?.id === user.id ? (
                              <Input
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              />
                            ) : user.email}</TableCell>
                            <TableCell>{editingUser?.id === user.id ? (
                              <Input
                                value={editForm.department}
                                onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                              />
                            ) : user.department}</TableCell>
                            <TableCell>{editingUser?.id === user.id ? (
                              <select
                                className="w-full p-2 border rounded"
                                value={editForm.role}
                                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                              >
                                <option value="admin">Admin</option>
                                <option value="tutor">Tutor</option>
                                <option value="learner">Learner</option>
                              </select>
                            ) : user.role}</TableCell>
                            <TableCell className="text-right space-x-2">
                              {editingUser?.id === user.id ? (
                                <>
                                  <Button size="sm" onClick={handleUpdateUser}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setEditingUser(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleChangePassword(user.id)}
                                  >
                                    Change Password
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingAnalytics ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : analytics.userCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingAnalytics ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : analytics.sessionCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +5% from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingAnalytics ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : analytics.activeUsers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +18% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingAnalytics ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : `${analytics.conversionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +2.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Searches</CardTitle>
                <CardDescription>
                  Most frequent search terms used on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.topSearches.map((search: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{search.term}</span>
                        <span className="text-muted-foreground">{search.count} searches</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.userGrowth.map((period: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{period.date}</span>
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">{period.count} users</span>
                          {period.change > 0 ? (
                            <ChevronUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure global platform settings and parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="site-name">Platform Name</Label>
                  <Input id="site-name" defaultValue="TutaLink" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" defaultValue="support@tutalink.com" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="max-session-duration">Maximum Session Duration (hours)</Label>
                  <Input id="max-session-duration" type="number" defaultValue="4" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="minimum-hourly-rate">Minimum Hourly Rate ($)</Label>
                  <Input id="minimum-hourly-rate" type="number" defaultValue="15.00" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                  <Input id="platform-fee" type="number" defaultValue="10" />
                </div>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user. Minimum 6 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewPassword}
              disabled={changePasswordMutation.isPending || passwordChange.newPassword.length < 6}
            >
              {changePasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}