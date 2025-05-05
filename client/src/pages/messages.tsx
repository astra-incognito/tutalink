import { useState } from "react";
import { useMessaging } from "@/hooks/use-messaging";
import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageList } from "@/components/messaging/message-list";
import { MessageInput } from "@/components/messaging/message-input";
import { NewConversationDialog } from "@/components/messaging/new-conversation-dialog";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function MessagesPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const {
    conversations,
    conversationsLoading,
    useConversation,
    sendMessage,
    createConversation,
    isSendingMessage,
    isCreatingConversation,
  } = useMessaging();
  
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  
  // Get the selected conversation details and messages
  const {
    data: conversationData,
    isLoading: conversationLoading,
  } = useConversation(selectedConversationId);
  
  // Handle user not logged in
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <h1 className="text-2xl font-bold">Please sign in to view messages</h1>
        <p className="text-muted-foreground">
          You need to be logged in to access the messaging feature.
        </p>
        <Button onClick={() => setLocation("/login")}>Sign In</Button>
      </div>
    );
  }
  
  // Handler for selecting a conversation
  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
  };
  
  // Handler for sending a message
  const handleSendMessage = (conversationId: number, content: string) => {
    sendMessage({
      conversationId,
      content,
    });
  };
  
  // Handler for creating a new conversation
  const handleCreateConversation = (participantIds: number[], title?: string) => {
    createConversation(
      { participantIds, title },
      {
        onSuccess: (conversation) => {
          // Close the dialog and select the new conversation
          setIsNewConversationDialogOpen(false);
          setSelectedConversationId(conversation.id);
        },
      }
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px] border rounded-lg overflow-hidden">
        {/* Conversation List */}
        <div className="border-r">
          <ConversationList
            conversations={conversations || []}
            selectedConversationId={selectedConversationId || undefined}
            onSelectConversation={handleSelectConversation}
            onNewConversation={() => setIsNewConversationDialogOpen(true)}
            isLoading={conversationsLoading}
          />
        </div>
        
        {/* Message Area */}
        <div className="col-span-2 flex flex-col">
          {selectedConversationId ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b">
                {conversationLoading ? (
                  <div className="animate-pulse h-6 w-48 bg-muted rounded"></div>
                ) : (
                  <h2 className="text-xl font-semibold">
                    {conversationData?.conversation?.title || 
                     conversationData?.conversation?.participants
                       ?.filter(p => p.userId !== user.id)
                       .map(p => p.user.fullName)
                       .join(", ") || 
                     "Conversation"}
                  </h2>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <MessageList
                  messages={conversationData?.messages || []}
                  isLoading={conversationLoading}
                />
              </div>
              
              {/* Message Input */}
              <MessageInput
                conversationId={selectedConversationId}
                onSendMessage={handleSendMessage}
                isLoading={isSendingMessage}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-muted-foreground mb-4">
                Select a conversation or start a new one
              </p>
              <Button onClick={() => setIsNewConversationDialogOpen(true)}>
                Start a New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* New Conversation Dialog */}
      <NewConversationDialog
        isOpen={isNewConversationDialogOpen}
        onClose={() => setIsNewConversationDialogOpen(false)}
        onCreateConversation={handleCreateConversation}
        isCreating={isCreatingConversation}
      />
    </div>
  );
}