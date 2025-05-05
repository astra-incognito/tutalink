import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  sender: {
    id: number;
    username: string;
    fullName: string;
    profileImage?: string;
  };
};

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const { user } = useAuth();
  const bottomOfListRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when new messages come in
  useEffect(() => {
    if (messages?.length && bottomOfListRef.current) {
      bottomOfListRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="flex flex-col space-y-4 p-4">
        {messages.map((message) => (
          <MessageItem 
            key={message.id} 
            message={message} 
            isCurrentUser={message.sender.id === user?.id} 
          />
        ))}
        <div ref={bottomOfListRef} />
      </div>
    </ScrollArea>
  );
}

function MessageItem({ message, isCurrentUser }: { message: Message; isCurrentUser: boolean }) {
  // Format the date to a readable string
  const formattedTime = format(new Date(message.createdAt), "h:mm a");
  const formattedDate = format(new Date(message.createdAt), "MMM d, yyyy");
  const today = format(new Date(), "MMM d, yyyy");
  const displayDate = formattedDate === today ? "Today" : formattedDate;

  return (
    <div
      className={cn(
        "flex items-start gap-2 max-w-[80%]",
        isCurrentUser ? "self-end flex-row-reverse" : "self-start"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.sender.profileImage} alt={message.sender.fullName} />
        <AvatarFallback>
          {message.sender.fullName.split(" ").map(name => name[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isCurrentUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {message.content}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {displayDate}, {formattedTime}
        </div>
      </div>
    </div>
  );
}