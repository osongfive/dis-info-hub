"use client";

import { Navbar } from "@/components/navbar";
import { ChatMessage } from "@/components/chat-message";
import { SourceCard } from "@/components/source-card";
import { SearchSidebar } from "@/components/search-sidebar";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Menu, X, Info, PlusCircle, MessageSquare, Trash2 } from "lucide-react";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import { sanitizeText } from "@/lib/security";
import { useChatSession } from "@/hooks/use-chat-session";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Input validation constants
const MAX_INPUT_LENGTH = 1000;

// --- Main Component ---
function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const {
    sessions,
    setSessions,
    activeSession,
    activeSessionId,
    startNewChat,
    switchSession,
    deleteSession,
    updateSessionById,
  } = useChatSession(initialQuery);

  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialQueryFired = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived state for active session
  const messages = activeSession?.messages ?? [];
  const sources = activeSession?.sources ?? [];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Core Query Logic ----
  const submitQuery = useCallback(async (queryText: string, sessionId?: string) => {
    const targetSessionId = sessionId ?? activeSessionId;
    if (!targetSessionId) return;

    setIsLoading(true);

    // Optimistically add user message + loading placeholder
    updateSessionById(targetSessionId, (s) => {
      const newMessages = [...s.messages];
      if (newMessages.length === 0 || newMessages[newMessages.length - 1].content !== queryText) {
        newMessages.push({ role: "user", content: queryText });
      }
      newMessages.push({ role: "assistant", content: "Searching documents and generating response..." });
      return { ...s, messages: newMessages };
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, category: selectedCategory }),
      });

      if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch(e) {}
        throw new Error((errData && errData.error) || "Failed to search documents.");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      let sources: any[] = [];
      let isCached = false;
      // U-02: Persist incomplete lines across reader.read() boundaries.
      let lineBuffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        // Append the new chunk to the buffer, then split on newlines.
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        // The last element may be an incomplete line — keep it in the buffer.
        lineBuffer = lines.pop() ?? "";
        
        for (const line of lines.filter(l => l.trim() !== '')) {
          try {
            const parsed = JSON.parse(line);
            
            // Handle Cache Hit (Single Payload)
            if (parsed.cached !== undefined && parsed.answer) {
              fullText = parsed.answer;
              sources = parsed.sources || [];
              isCached = parsed.cached;
              break;
            }
            
            // Handle Stream Events
            if (parsed.type === 'init') {
              sources = parsed.sources || [];
              updateSessionById(targetSessionId, { sources });
            } else if (parsed.type === 'chunk') {
              fullText += parsed.text;
            } else if (parsed.type === 'error') {
              // U-01 complement: surface the server-side stream interruption.
              fullText += `\n\n*${parsed.message}*`;
            }
          } catch (e) {
            // Only truly malformed JSON reaches here (not split-line artifacts).
            console.warn('[NDJSON] Skipping unparseable line:', line);
          }
        }
        
        const currentHtml = fullText ? await marked.parse(fullText) : "Thinking...";
        updateSessionById(targetSessionId, (s) => {
          const newMessages = [...s.messages];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: currentHtml,
            summary: isCached 
              ? "Instant answer retrieved from school knowledge base." 
              : "Synthesized answer from official documents."
          };
          return { ...s, messages: newMessages };
        });
      }
    } catch (err: any) {
      console.error(err);
      updateSessionById(targetSessionId, (s) => {
        const newMessages = [...s.messages];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error searching the documents.",
        };
        return { ...s, messages: newMessages };
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, selectedCategory, updateSessionById]);

  // Fire initial query from homepage (?q=...)
  useEffect(() => {
    if (initialQuery && !initialQueryFired.current) {
      initialQueryFired.current = true;
      const session = startNewChat(initialQuery);
      setTimeout(() => submitQuery(initialQuery, session.id), 0);
    }
  }, [initialQuery, submitQuery, startNewChat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeText(input, MAX_INPUT_LENGTH);
    if (!sanitized || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = startNewChat(sanitized);
      sessionId = session.id;
    }

    setInput("");
    submitQuery(sanitized, sessionId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= MAX_INPUT_LENGTH) setInput(e.target.value);
  };

  const onStartNewChat = () => {
    startNewChat();
    setSidebarOpen(false);
  };

  const onSwitchSession = (id: string) => {
    switchSession(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-border bg-background pt-16 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden p-4">
            <Button
              className="w-full justify-start gap-2 mb-4"
              onClick={onStartNewChat}
            >
              <PlusCircle className="h-4 w-4" />
              New Chat
            </Button>

            <SearchSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setSidebarOpen(false);
              }}
            />

            {sessions.length > 0 && (
              <div className="mt-4 flex-1 overflow-y-auto">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  History
                </p>
                <div className="space-y-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        session.id === activeSessionId
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => onSwitchSession(session.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">Ask a Question</h2>
                <p className="max-w-md text-muted-foreground">
                  Type your question below to search through official school documents and get accurate answers with sources.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    role={message.role}
                    content={message.content}
                    summary={"summary" in message ? message.summary : undefined}
                  />
                ))}
                {/* U-04: Inline sources for mobile/tablet (hidden on xl where the aside is shown) */}
                {sources.length > 0 && (
                  <div className="xl:hidden rounded-xl border border-border bg-muted/20 p-4">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sources</h2>
                    <div className="space-y-3">
                      {sources.map((source, index) => (
                        <SourceCard
                          key={index}
                          title={source.title}
                          page={source.page || 1}
                          preview={source.preview}
                          category={source.category}
                          fileUrl={source.fileUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-background p-4">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="relative flex-1">
                <input
                  id="chat-input"
                  aria-label="Ask a question about school policies"
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question about school policies, schedules, or requirements..."
                  maxLength={MAX_INPUT_LENGTH}
                  autoComplete="off"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button type="submit" size="lg" className="shrink-0 gap-2" disabled={isLoading}>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
              <p>Powered by AI · Answers sourced from official DIS documents only</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex items-center justify-center hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 text-center leading-relaxed">
                  This service uses artificial intelligence to process your question and retrieve relevant passages from official DIS documents. Responses do not draw from the internet or any external source.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </main>

        {messages.length > 0 && (
          <aside className="hidden w-80 shrink-0 border-l border-border bg-muted/20 p-4 xl:block">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sources</h2>
            <div className="space-y-3">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources found.</p>
              ) : (
                sources.map((source, index) => (
                  <SourceCard
                    key={index}
                    title={source.title}
                    page={source.page || 1}
                    preview={source.preview}
                    category={source.category}
                    fileUrl={source.fileUrl}
                  />
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
