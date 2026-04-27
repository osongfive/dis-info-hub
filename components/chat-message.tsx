"use client";

import { cn } from "@/lib/utils";
import { User, Bot, ThumbsUp, ThumbsDown } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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

  // F-03: Per-message feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = async (rating: 'positive' | 'negative') => {
    setFeedbackGiven(rating);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, preview: content.slice(0, 300) }),
      });
    } catch (e) {
      console.error('[feedback] Failed to submit:', e);
    }
  };
  
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
          <div className="mt-3 border-t border-border/40 pt-3">
            <p className="text-[10px] text-muted-foreground/70 italic">
              Always verify this answer by reading the source document.
            </p>
            {/* F-03: Feedback buttons */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60">Helpful?</span>
              <button
                onClick={() => handleFeedback('positive')}
                disabled={feedbackGiven !== null}
                aria-label="Mark as helpful"
                className={cn(
                  "rounded p-1 transition-colors hover:text-green-600 disabled:cursor-default",
                  feedbackGiven === 'positive' ? "text-green-600" : "text-muted-foreground/50"
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleFeedback('negative')}
                disabled={feedbackGiven !== null}
                aria-label="Mark as unhelpful"
                className={cn(
                  "rounded p-1 transition-colors hover:text-red-500 disabled:cursor-default",
                  feedbackGiven === 'negative' ? "text-red-500" : "text-muted-foreground/50"
                )}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
              {feedbackGiven && (
                <span className="text-[10px] text-muted-foreground/60">Thanks!</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
