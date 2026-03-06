import { useState, useRef, useEffect, useCallback } from "react";
import { DimensionScore } from "@/types/assessment";
import { getArchetype } from "@/lib/archetypes";
import { generateResponse } from "@/lib/chatEngine";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatTabProps {
  scores: DimensionScore[];
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const SUGGESTION_CHIPS = [
  "Should I hire this person?",
  "What are their biggest strengths?",
  "What are the risk areas?",
  "How strong is their Microsoft expertise?",
  "Can they lead and develop a team?",
  "How do they handle pressure and crises?",
];

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

const ChatTab = ({ scores }: ChatTabProps) => {
  const archetype = getArchetype(scores);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: `I've analyzed the candidate's IT leadership competency profile. They're a **${archetype.name}** — ${archetype.summary.toLowerCase()}\n\n**Recommendation: ${archetype.recommendationLabel}**\n\nAsk me anything about their fit for the IT Director role — strengths, risks, specific competencies, or whether you should hire them.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;
      const userMsg = text.trim();
      setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
      setInput("");
      setIsTyping(true);

      setTimeout(() => {
        const response = generateResponse(userMsg, scores, archetype.name);
        setMessages((prev) => [...prev, { role: "ai", text: response }]);
        setIsTyping(false);
      }, 800 + Math.random() * 600);
    },
    [scores, archetype.name, isTyping]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
      <p className="text-sm text-muted-foreground mb-3">
        Ask questions about this candidate's IT leadership competency profile and fit for the IT Director role.
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            className="chip"
            disabled={isTyping}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
            />
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="chat-bubble chat-bubble-ai flex items-center gap-1">
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this candidate's profile..."
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isTyping}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatTab;
