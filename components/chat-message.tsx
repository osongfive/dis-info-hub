import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  summary?: string;
}

// Sanitize HTML content to prevent XSS attacks
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br", "span", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    // Force all links to open in new tab with security attributes
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
  });
}

export function ChatMessage({ role, content, summary }: ChatMessageProps) {
  const isUser = role === "user";
  
  // For user messages, escape HTML entirely; for assistant, sanitize allowed HTML
  const safeContent = isUser 
    ? content.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : sanitizeHtml(content);

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-primary-foreground" />
        ) : (
          <Bot className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-5 py-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card"
        )}
      >
        {!isUser && (
          <div className="mb-2.5">
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold opacity-70">
              AI-generated response
            </Badge>
          </div>
        )}
        {!isUser && summary && (
          <div className="mb-3 rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{summary}</p>
          </div>
        )}
        <div
          className={cn(
            "chat-message-content prose prose-sm max-w-none",
            isUser
              ? "prose-invert"
              : "prose-neutral dark:prose-invert"
          )}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
        {!isUser && (
          <p className="mt-4 text-[10px] text-muted-foreground/70 italic border-t border-border/40 pt-2">
            Always verify this answer by reading the source document.
          </p>
        )}
      </div>
    </div>
  );
}
