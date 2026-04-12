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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

declare global {
  interface Window {
    puter: any;
  }
}

// Input validation constants
const MAX_INPUT_LENGTH = 1000;
const SANITIZE_PATTERN = /[<>{}]/g;

// AI Configuration
const AI_MODEL_PRIMARY = "gpt-4o-mini";
const AI_MODEL_FAST = "gpt-4o-mini";

// Storage key for multi-session chat history
const SESSIONS_KEY = "dis-chat-sessions";
const ACTIVE_SESSION_KEY = "dis-active-session";

function sanitizeInput(input: string): string {
  return input.trim().slice(0, MAX_INPUT_LENGTH).replace(SANITIZE_PATTERN, "");
}

// --- Types ---
interface Message {
  role: "user" | "assistant";
  content: string;
  summary?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  sources: any[];
  createdAt: number;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createSession(firstMessage?: string): ChatSession {
  return {
    id: generateId(),
    title: firstMessage ? firstMessage.slice(0, 40) : "New Chat",
    messages: [],
    sources: [],
    createdAt: Date.now(),
  };
}

// --- Main Component ---
function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialQueryFired = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived state for active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];
  const sources = activeSession?.sources ?? [];

  // ---- Persistence ----
  // Load sessions from localStorage on mount
  useEffect(() => {
    // If there's an initial query from the homepage, start fresh - don't restore old session
    if (initialQuery) return;

    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) {
        const loaded: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(loaded) && loaded.length > 0) {
          setSessions(loaded);
          const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
          const matchActive = loaded.find((s) => s.id === savedActive);
          setActiveSessionId(matchActive ? matchActive.id : loaded[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, []);

  // Save sessions to localStorage on change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Session Management ----
  const startNewChat = useCallback(() => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setSidebarOpen(false);
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next.length > 0 ? next[0].id : null);
      }
      if (next.length === 0) {
        localStorage.removeItem(SESSIONS_KEY);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return next;
    });
  }, [activeSessionId]);

  // ---- Core Query Logic ----
  const submitQuery = useCallback(async (queryText: string, sessionId?: string) => {
    const targetSessionId = sessionId ?? activeSessionId;
    if (!targetSessionId) return;

    setIsLoading(true);

    // Optimistically add user message + loading placeholder
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSessionId) return s;
        const newMessages = [...s.messages];
        if (newMessages.length === 0 || newMessages[newMessages.length - 1].content !== queryText) {
          newMessages.push({ role: "user", content: queryText });
        }
        newMessages.push({ role: "assistant", content: "Searching documents and generating response..." });
        return { ...s, messages: newMessages };
      })
    );

    try {
      // Internal translation for Korean queries
      let searchQuery = queryText;
      const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(queryText);
      if (isKorean && typeof window !== "undefined" && window.puter) {
        try {
          const translationResponse = await window.puter.ai.chat(
            `Translate this school-related question into a concise English search query for a document database. Just provide the English translation, nothing else.\n\nQuestion: ${queryText}`,
            { model: AI_MODEL_FAST }
          );
          if (translationResponse?.toString()) {
            searchQuery = translationResponse.toString().trim();
          }
        } catch (tErr) {
          console.warn("Translation failed, using original:", tErr);
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, searchQuery, category: selectedCategory }),
      });

      const data = await response.json();

      // Cached answer path
      if (data.cached && data.answer) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSessionId) return s;
            const newMessages = [...s.messages];
            newMessages[newMessages.length - 1] = {
              role: "assistant",
              content: data.answer,
              summary: "Instant answer retrieved from school knowledge base.",
            };
            return { ...s, messages: newMessages, sources: data.sources || [] };
          })
        );
        setIsLoading(false);
        return;
      }

      const contextText = data.context || "";
      let finalAnswerHtml = "";

      if (contextText && data.systemPrompt && typeof window !== "undefined" && window.puter) {
        const prompt = `${data.systemPrompt}

Document Context:
${contextText}

Student Question:
${queryText}`;

        try {
          const aiResponse = await window.puter.ai.chat(prompt, { model: AI_MODEL_PRIMARY, stream: true });
          let fullText = "";

          for await (const chunk of aiResponse) {
            if (chunk.type === "text") {
              fullText += chunk.text;
              const currentHtml = await marked.parse(fullText);
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== targetSessionId) return s;
                  const newMessages = [...s.messages];
                  newMessages[newMessages.length - 1] = { role: "assistant", content: currentHtml };
                  return { ...s, messages: newMessages };
                })
              );
            }
          }

          // Post-process: ensure list formatting
          let text = fullText;
          const hasBullets = /(^|\n)\s*[-*]\s+/m.test(text) || /(^|\n)\s*\d+\.\s+/m.test(text);
          if (!hasBullets && text.length > 100) {
            const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
            if (sentences.length > 1) {
              text = sentences.map((s) => (s.trim() ? `- ${s.trim()}` : "")).join("\n");
            }
          }
          finalAnswerHtml = await marked.parse(text);

          // Save to server cache
          fetch("/api/cache-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: queryText, answer: finalAnswerHtml, sources: data.sources, cacheToken: data.cacheToken }),
          }).catch((e) => console.error("Cache save error:", e));

        } catch (aiErr) {
          console.error("AI generation error:", aiErr);
          finalAnswerHtml = "AI generation unavailable. Please try again.";
        }
      } else {
        finalAnswerHtml = contextText
          ? "AI generation unavailable. Puter requires connection."
          : "I couldn't find relevant information in the school documents for your question.";
      }

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          const newMessages = [...s.messages];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: finalAnswerHtml,
            summary: data.sources?.length > 0 ? "Here is what I found in the school documents." : undefined,
          };
          return { ...s, messages: newMessages, sources: data.sources || [] };
        })
      );
    } catch (err) {
      console.error(err);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          const newMessages = [...s.messages];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: "Sorry, I encountered an error searching the documents.",
          };
          return { ...s, messages: newMessages };
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, selectedCategory]);

  // Fire initial query from homepage (?q=...)
  useEffect(() => {
    if (initialQuery && !initialQueryFired.current) {
      initialQueryFired.current = true;
      // Always start a FRESH session for homepage queries
      const session = createSession(initialQuery);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      // We must pass the session ID directly because state hasn't updated yet
      setTimeout(() => submitQuery(initialQuery, session.id), 0);
    }
  }, [initialQuery, submitQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeInput(input);
    if (!sanitized || isLoading) return;

    // If no session exists yet, create one
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = createSession(sanitized);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      sessionId = session.id;
    }

    setInput("");
    submitQuery(sanitized, sessionId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= MAX_INPUT_LENGTH) setInput(e.target.value);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
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
            {/* New Chat Button */}
            <Button
              className="w-full justify-start gap-2 mb-4"
              onClick={startNewChat}
            >
              <PlusCircle className="h-4 w-4" />
              New Chat
            </Button>

            {/* Category Filter */}
            <SearchSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setSidebarOpen(false);
              }}
            />

            {/* Chat History List */}
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
                      onClick={() => switchSession(session.id)}
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

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="relative flex-1">
                <input
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

        {/* Sources Panel */}
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
