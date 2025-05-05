import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";

type Message = {
  id: number;
  content: string;
  senderId: number;
  createdAt: Date;
  sender?: {
    fullName: string;
  };
};

type Conversation = {
  id: number;
  title: string | null;
  participants: Array<{
    userId: number;
    user: {
      id: number;
      fullName: string;
      profileImage?: string;
    };
  }>;
  lastMessage?: Message;
  unreadCount?: number;
  lastMessageAt?: Date | null;
};

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: number;
  onSelectConversation: (conversationId: number) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading,
}: ConversationListProps) {
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Messages</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          title="New Conversation"
        >
          <PlusCircle className="h-5 w-5" />
          <span className="sr-only">New Conversation</span>
        </Button>
      </div>
      
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <p className="text-muted-foreground mb-4">No conversations yet</p>
          <Button onClick={onNewConversation}>Start a Conversation</Button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                currentUserId={user?.id}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  currentUserId,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserId?: number;
}) {
  // Get other participants (excluding the current user)
  const otherParticipants = conversation.participants.filter(
    (p) => p.userId !== currentUserId
  );
  
  // Use the title or generate a title from participant names
  const title = conversation.title || otherParticipants.map((p) => p.user.fullName).join(", ");
  
  // Get the avatar for the conversation (first participant other than current user)
  const avatarUser = otherParticipants[0]?.user;
  
  // Format the last message time
  let timeDisplay = "";
  if (conversation.lastMessageAt) {
    const lastMessageDate = new Date(conversation.lastMessageAt);
    const today = new Date();
    
    if (lastMessageDate.toDateString() === today.toDateString()) {
      // Today, show time
      timeDisplay = format(lastMessageDate, "h:mm a");
    } else {
      // Not today, show date
      timeDisplay = format(lastMessageDate, "MMM d");
    }
  }
  
  // Get preview text for the last message
  const previewText = conversation.lastMessage?.content || "No messages yet";
  
  // Get sender name for the preview (if not the current user)
  let senderPreview = "";
  if (conversation.lastMessage?.senderId !== currentUserId && conversation.lastMessage?.sender) {
    senderPreview = `${conversation.lastMessage.sender.fullName}: `;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors",
        isSelected && "bg-muted"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        {avatarUser?.profileImage ? (
          <AvatarImage src={avatarUser.profileImage} alt={avatarUser.fullName} />
        ) : (
          <AvatarFallback>
            {avatarUser ? avatarUser.fullName.substring(0, 2) : "?"}
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className="font-medium truncate">{title}</h3>
          {timeDisplay && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {timeDisplay}
            </span>
          )}
        </div>
        
        <div className="flex items-center">
          <p className="text-sm text-muted-foreground truncate">
            {senderPreview}{previewText}
          </p>
          
          {conversation.unreadCount ? (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}