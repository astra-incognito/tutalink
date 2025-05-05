import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
  conversationId: number;
  onSendMessage: (conversationId: number, content: string) => void;
  isLoading: boolean;
}

export function MessageInput({ conversationId, onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    onSendMessage(conversationId, message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Ctrl+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t">
      <Textarea
        placeholder="Type your message here..."
        className="flex-1 min-h-[80px] max-h-[160px]"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <Button
        size="icon"
        className="h-10 w-10"
        onClick={handleSendMessage}
        disabled={!message.trim() || isLoading}
      >
        <Send className="h-5 w-5" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}