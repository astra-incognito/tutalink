import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type SiteSetting = {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: Date;
  updatedBy: number | null;
};

export function useSiteSettings(category?: string) {
  const { toast } = useToast();
  
  // Query to fetch site settings
  const {
    data: settings = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<SiteSetting[]>({
    queryKey: ['/api/site-settings', category],
    queryFn: async () => {
      const url = category 
        ? `/api/site-settings?category=${encodeURIComponent(category)}`
        : '/api/site-settings';
      const res = await apiRequest('GET', url);
      return await res.json();
    }
  });

  // Mutation to update a setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest('PUT', `/api/site-settings/${key}`, { value });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Setting updated",
        description: "The setting has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to create a setting
  const createSettingMutation = useMutation({
    mutationFn: async (setting: Omit<SiteSetting, 'id' | 'updatedAt' | 'updatedBy'>) => {
      const res = await apiRequest('POST', '/api/site-settings', setting);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Setting created",
        description: "The setting has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a setting
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest('DELETE', `/api/site-settings/${key}`);
    },
    onSuccess: () => {
      toast({
        title: "Setting deleted",
        description: "The setting has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    isError,
    error,
    refetch,
    updateSetting: updateSettingMutation.mutate,
    createSetting: createSettingMutation.mutate,
    deleteSetting: deleteSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
    isCreating: createSettingMutation.isPending,
    isDeleting: deleteSettingMutation.isPending
  };
}

// Helper hook to get a specific setting value
export function useSiteSetting(key: string) {
  const { settings, isLoading, isError, error } = useSiteSettings();
  
  const setting = settings.find(s => s.key === key);
  
  return {
    value: setting?.value || '',
    setting,
    isLoading,
    isError,
    error
  };
}