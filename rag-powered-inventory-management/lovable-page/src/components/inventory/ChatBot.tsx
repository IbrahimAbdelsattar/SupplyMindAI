import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type InventoryItem } from "@/data/inventory";
import { askInventory } from "@/lib/api";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface ChatBotProps {
  focusedItem: InventoryItem | null;
}

export default function ChatBot({ focusedItem }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Ask Stock Mind is ready. Ask about stock, demand, coverage, active products, or the latest snapshot.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const msg = input.trim();
    if (!msg) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text: msg }]);
    setTyping(true);

    try {
      const answer = await askInventory(msg, focusedItem?.sku ?? null);
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: answer.answer,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach the RAG backend.";
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: `I could not complete that request. ${message}`,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-5 w-5 text-accent" />
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Ask Stock Mind</span>
          <span className="block text-xs text-muted-foreground">
            {focusedItem ? `Selected: ${focusedItem.name} (${focusedItem.sku})` : "Select a row to add product context."}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "rounded-br-md bg-chat-bubble-user text-chat-bubble-user-fg"
                      : "rounded-bl-md bg-chat-bubble-bot text-chat-bubble-bot-fg shadow-sm"
                  }`}
                >
                  {renderMarkdown(message.text)}
                </div>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-chat-bubble-bot px-4 py-3 text-sm text-chat-bubble-bot-fg">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Ask Stock Mind is thinking...
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 border-t border-border px-4 py-3">
        <Input
          placeholder={focusedItem ? `Ask Stock Mind about ${focusedItem.name}...` : "Ask Stock Mind about products, dates, or coverage..."}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && !typing && void send()}
          className="flex-1"
          disabled={typing}
        />
        <Button
          size="icon"
          onClick={() => void send()}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={typing}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
