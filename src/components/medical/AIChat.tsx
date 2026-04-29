import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";

export type ChatMsg = {
  id: string;
  from: "me" | "ai";
  text: string;
  ts: number;
  isError?: boolean;
};

interface AIChatProps {
  patientName?: string;
  initialMessages?: ChatMsg[];
}

const Dots = () => (
  <span className="inline-flex gap-1 items-center h-5">
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
  </span>
);

export default function AIChat({ patientName = "Patient", initialMessages = [] }: AIChatProps) {
  const supabase: any = supabaseTyped;
  const [messages, setMessages] = useState<ChatMsg[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "welcome",
            from: "ai",
            text:
              (patientName && patientName !== "Patient"
                ? `Hi ${patientName}! `
                : "Hi! ") +
              "I'm **CuraSense AI**, your health companion. I can help with symptoms, lifestyle tips, diet advice, and understanding your health concerns.\n\nWhat can I help you with today?",
            ts: Date.now(),
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMsg = {
      id: "u-" + Date.now(),
      from: "me",
      text,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const context = messages.slice(-10).map((m) => ({
      role: m.from === "me" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      console.log("[AIChat] Calling function with question:", text);

      const { data, error } = await supabase.functions.invoke("patient-ai-assistant", {
        body: {
          question: text,
          patient_name: patientName,
          context,
          stream: false,
        },
      });

      console.log("[AIChat] Response:", { data, error });

      if (error) {
        throw new Error(error.message || "Function error");
      }

      const reply = String(data?.answer || "").trim();
      if (!reply) {
        throw new Error("Empty reply from AI");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: "a-" + Date.now(),
          from: "ai",
          text: reply,
          ts: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error("[AIChat] Error:", err);
      toast.error("AI Error: " + (err.message || "Unknown"));
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          from: "ai",
          text:
            "**Connection Error**\n\n" +
            "I'm having trouble connecting to my knowledge base.\n\n" +
            "**Error:** " + (err.message || "Unknown error") + "\n\n" +
            "Please try again in a moment.",
          ts: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, patientName, supabase]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.from === "me" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm " +
                (msg.from === "me"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : msg.isError
                  ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                  : "bg-card rounded-bl-sm border")
              }
            >
              {msg.from === "ai" && !msg.isError && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot size={14} className="text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary">CuraSense AI</span>
                </div>
              )}
              {msg.from === "ai" && msg.isError && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} />
                  <span className="text-xs font-semibold">Error</span>
                </div>
              )}
              {msg.from === "me" ? (
                <div className="flex items-start gap-2">
                  <span className="flex-1">{msg.text}</span>
                  <div className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={10} />
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-card rounded-bl-sm border">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot size={14} className="text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary">CuraSense AI</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2">
                <Dots />
                <span className="text-xs">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-card flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your health..."
          className="rounded-xl resize-none min-h-[44px] max-h-32 flex-1"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          size="icon"
          disabled={isLoading || !input.trim()}
          className="rounded-xl h-11 w-11 shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

