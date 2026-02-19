import { useState, useRef, useEffect, useCallback } from "react";
import { DimensionScore } from "@/types/assessment";
import { buildProfileContext } from "@/lib/profileContext";
import { getArchetype } from "@/lib/archetypes";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface CoachingChatProps {
  scores: DimensionScore[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const COACHING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coaching-chat`;

const SUGGESTION_CHIPS = [
  "How should I deliver tough feedback to this person?",
  "What are the early warning signs they're stressed?",
  "How much oversight should I give them?",
  "How do I build trust with this person?",
  "What will make them feel like they belong here?",
  "How will they handle conflict with a teammate?",
  "What kind of work environment helps them focus?",
  "What would make them leave the company?",
];

const CoachingChat = ({ scores }: CoachingChatProps) => {
  const archetype = getArchetype(scores);
  const profileContext = buildProfileContext(scores);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput("");
      setIsStreaming(true);

      let assistantContent = "";

      try {
        const resp = await fetch(COACHING_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            profileContext,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "AI service error" }));
          throw new Error(err.error || `Error ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        const upsertAssistant = (nextChunk: string) => {
          assistantContent += nextChunk;
          const content = assistantContent;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
            }
            return [...prev, { role: "assistant", content }];
          });
        };

        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore partial leftovers */
            }
          }
        }
      } catch (e) {
        console.error("Coaching chat error:", e);
        toast({
          title: "AI Error",
          description: e instanceof Error ? e.message : "Failed to get AI response",
          variant: "destructive",
        });
        // Remove the user message if no assistant response was generated
        if (!assistantContent) {
          setMessages((prev) => prev.slice(0, -1));
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, profileContext]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Coaching Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Powered by AI · Coaching for a <strong>{archetype.name}</strong>
          </p>
        </div>
      </div>

      {/* Intro */}
      {messages.length === 0 && (
        <div className="card-elevated p-4 mb-4 animate-fade-in">
          <p className="text-sm text-muted-foreground mb-3">
            Ask me anything about coaching, managing, or giving feedback to someone with this{" "}
            <strong>{archetype.name}</strong> profile. I'll provide specific, actionable advice based on their personality dimensions.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="chip"
                disabled={isStreaming}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center mt-1">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div
              className={`chat-bubble ${
                msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
              } prose prose-sm max-w-none [&_strong]:text-foreground [&_li]:text-secondary-foreground`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center mt-1">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center mt-1">
              <Bot className="w-3.5 h-3.5 text-accent" />
            </div>
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
          placeholder="Ask about coaching, feedback, or management..."
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isStreaming}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isStreaming}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default CoachingChat;
