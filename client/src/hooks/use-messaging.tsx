import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  contentType: string;
  attachment: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  sender?: {
    id: number;
    username: string;
    fullName: string;
    profileImage?: string;
    // other user fields without sensitive info
  };
};

type Conversation = {
  id: number;
  title: string | null;
  sessionId: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  participants: Array<{
    userId: number;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    lastReadAt: Date | null;
    user: {
      id: number;
      username: string;
      fullName: string;
      profileImage?: string;
      // other user fields without sensitive info
    };
  }>;
  lastMessage?: Message;
  unreadCount?: number;
};

type WebSocketMessage = {
  type: string;
  conversationId?: number;
  message?: Message;
  status?: string;
  userId?: number;
};

export function useMessaging() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) {
      // Not logged in, don't connect
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      setIsConnected(false);
      return;
    }
    
    const connectWebSocket = () => {
      try {
        // Set up the WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        if (socket.current?.readyState === WebSocket.OPEN) {
          return; // Already connected
        }
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          
          // Clear any reconnect timeout
          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
          }
          
          // Send a ping every 30 seconds to keep the connection alive
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            
            if (data.type === 'connection' && data.status === 'connected') {
              console.log('Connected with user ID:', data.userId);
            }
            else if (data.type === 'message' && data.message && data.conversationId) {
              // New message received, update the cache
              queryClient.invalidateQueries({
                queryKey: ['/api/conversations', data.conversationId]
              });
              
              // Also invalidate the conversation list to update unread counts
              queryClient.invalidateQueries({
                queryKey: ['/api/conversations']
              });
              
              // Show notification for messages that are not from the current user
              if (data.message.senderId !== user.id) {
                toast({
                  title: `New message from ${data.message.sender?.fullName}`,
                  description: data.message.content.substring(0, 50) + (data.message.content.length > 50 ? '...' : ''),
                });
              }
            }
            else if (data.type === 'pong') {
              // Server responded to our ping
              console.log('WebSocket connection is active');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            title: 'Connection Error',
            description: 'Error connecting to messaging server. Retrying...',
            variant: 'destructive',
          });
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
          setIsConnected(false);
          
          // Try to reconnect after a delay
          if (!reconnectTimeout.current) {
            reconnectTimeout.current = setTimeout(() => {
              reconnectTimeout.current = null;
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 5000); // Retry after 5 seconds
          }
        };
        
        socket.current = ws;
      } catch (error) {
        console.error('Failed to set up WebSocket:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to messaging server.',
          variant: 'destructive',
        });
      }
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [user, queryClient, toast]);
  
  // Get all conversations for the current user
  const { 
    data: conversations, 
    isLoading: conversationsLoading,
    error: conversationsError
  } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      if (!user) return [];
      
      const res = await fetch('/api/conversations');
      if (!res.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return await res.json();
    },
    enabled: !!user,
  });
  
  // Get a specific conversation with messages
  const useConversation = (conversationId: number | null) => {
    return useQuery({
      queryKey: ['/api/conversations', conversationId],
      queryFn: async () => {
        if (!conversationId) return null;
        
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch conversation');
        }
        return await res.json();
      },
      enabled: !!conversationId && !!user,
    });
  };
  
  // Get or create a session-specific conversation
  const useSessionConversation = (sessionId: number | null) => {
    return useQuery({
      queryKey: ['/api/sessions', sessionId, 'conversation'],
      queryFn: async () => {
        if (!sessionId) return null;
        
        const res = await fetch(`/api/sessions/${sessionId}/conversation`);
        if (!res.ok) {
          throw new Error('Failed to fetch session conversation');
        }
        return await res.json();
      },
      enabled: !!sessionId && !!user,
    });
  };
  
  // Create a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async ({ title, participantIds }: { title?: string, participantIds: number[] }) => {
      const res = await apiRequest('POST', '/api/conversations', { title, participantIds });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: 'Conversation Created',
        description: 'New conversation has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Find or create a direct conversation with another user
  const getDirectConversationMutation = useMutation({
    mutationFn: async ({ otherUserId }: { otherUserId: number }) => {
      const res = await apiRequest('POST', '/api/conversations/direct', { otherUserId });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.setQueryData(['/api/conversations', data.id], { 
        conversation: data,
        messages: [] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create direct conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Send a message in a conversation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      contentType = 'text',
      attachment = null 
    }: { 
      conversationId: number, 
      content: string, 
      contentType?: string,
      attachment?: string | null 
    }) => {
      const res = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        content,
        contentType,
        attachment
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      // Update the conversation query data to include the new message
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', variables.conversationId]
      });
      
      // Also update the conversation list to show the latest message
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations']
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  return {
    // WebSocket connection state
    isConnected,
    
    // Conversations data and loading state
    conversations,
    conversationsLoading,
    conversationsError,
    
    // Hooks for specific conversations
    useConversation,
    useSessionConversation,
    
    // Mutations
    createConversation: createConversationMutation.mutate,
    getDirectConversation: getDirectConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    
    // Mutation states
    isCreatingConversation: createConversationMutation.isPending,
    isGettingDirectConversation: getDirectConversationMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
  };
}