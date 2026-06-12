import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { copilotChat } from "@/lib/knowledgeApi";
import type { InventoryItem } from "./InventoryTable";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface ChatBotProps {
  focusedItem: InventoryItem | null;
}

export default function ChatBot({ focusedItem }: ChatBotProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: t("chatbot:initialGreeting"),
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
      const result = await copilotChat({
        message: msg,
        product_id: focusedItem?.sku ?? undefined,
        mode: "business",
      });
      setMessages((current) => [
        ...current,
        { role: "bot", text: result.answer },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("chatbot:unreachableError");
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: `${t("chatbot:requestFailed")} ${message}`,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{t("chatbot:title")}</span>
          <span className="block text-xs text-muted-foreground">
            {focusedItem ? `${t("chatbot:selected")} ${focusedItem.name} (${focusedItem.sku})` : t("chatbot:noSelection")}
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
                      ? "rounded-br-md rtl:rounded-bl-md rtl:rounded-br-none bg-primary text-primary-foreground"
                      : "rounded-bl-md rtl:rounded-br-md rtl:rounded-bl-none bg-muted"
                  }`}
                >
                  {renderMarkdown(message.text)}
                </div>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md rtl:rounded-br-md rtl:rounded-bl-none bg-muted px-4 py-3 text-sm">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("chatbot:thinking")}
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 border-t px-4 py-3">
        <Input
          placeholder={focusedItem ? `${t("chatbot:askAbout")} ${focusedItem.name}...` : t("chatbot:inputPlaceholder")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && !typing && send()}
          className="flex-1"
          disabled={typing}
        />
        <Button
          size="icon"
          onClick={send}
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


