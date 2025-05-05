import { useMessaging } from "@/hooks/use-messaging";
import { MessageList } from "@/components/messaging/message-list";
import { MessageInput } from "@/components/messaging/message-input";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionConversationProps {
  sessionId: number;
}

export function SessionConversation({ sessionId }: SessionConversationProps) {
  const {
    useSessionConversation,
    sendMessage,
    isSendingMessage,
  } = useMessaging();
  
  // Get the session-specific conversation
  const {
    data: conversationData,
    isLoading,
    error,
  } = useSessionConversation(sessionId);
  
  // Handle loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Chat</CardTitle>
          <CardDescription>Loading conversation...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Chat</CardTitle>
          <CardDescription>There was an error loading the conversation.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load conversation: {error.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  // If we have data but no conversation yet
  if (!conversationData?.conversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Chat</CardTitle>
          <CardDescription>There was an error loading the conversation.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Conversation not found.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Handler for sending a message
  const handleSendMessage = (conversationId: number, content: string) => {
    sendMessage({
      conversationId,
      content,
    });
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Session Chat</CardTitle>
        <CardDescription>
          Communicate with {conversationData.conversation.participants
            .filter(p => p.userId !== conversationData.conversation.participants[0].userId)
            .map(p => p.user.fullName)
            .join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col h-[400px]">
        <div className="flex-1 overflow-hidden mb-4">
          <MessageList
            messages={conversationData.messages || []}
            isLoading={false}
          />
        </div>
        <MessageInput
          conversationId={conversationData.conversation.id}
          onSendMessage={handleSendMessage}
          isLoading={isSendingMessage}
        />
      </CardContent>
    </Card>
  );
}