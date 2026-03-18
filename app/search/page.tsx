"use client";

import { Navbar } from "@/components/navbar";
import { ChatMessage } from "@/components/chat-message";
import { SourceCard } from "@/components/source-card";
import { SearchSidebar } from "@/components/search-sidebar";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Menu, X, Info } from "lucide-react";
import { useState, useEffect, Suspense, useRef } from "react";
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

// 🧠 AI Configuration - Easy Reversion
// Primary: For final answers (Reasoning & Detail)
// Fast: For quick internal tasks (Translation)
const AI_MODEL_PRIMARY = "gpt-4o-mini"; 
const AI_MODEL_FAST = "gpt-4o-mini";

// Sanitize user input to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, MAX_INPUT_LENGTH)
    .replace(SANITIZE_PATTERN, "");
}



function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [messages, setMessages] = useState<any[]>([]);
  
  // Use a ref to strictly prevent duplicate initial query fires
  const initialQueryFired = useRef(false);
  
  const [sources, setSources] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queryCache, setQueryCache] = useState<Record<string, { answer: string, sources: any[] }>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_INPUT_LENGTH) {
      setInput(value);
    }
  };

  const submitQuery = async (queryText: string) => {
    const cacheKey = `${queryText}-${selectedCategory}`;
    if (queryCache[cacheKey]) {
      setMessages((prev) => [
        ...prev,
        { role: "user" as const, content: queryText },
        { 
          role: "assistant" as const, 
          content: queryCache[cacheKey].answer,
          summary: queryCache[cacheKey].sources.length > 0 ? "Retrieved from session cache." : undefined
        }
      ]);
      setSources(queryCache[cacheKey].sources);
      return;
    }

    setIsLoading(true);
    setSources([]); // clear old sources
    
    // Optimistically add loading state
    setMessages((prev) => {
      // if the last message is already user's (like from initial query), don't add it again
      const currentMessages = [...prev];
      if (currentMessages.length === 0 || currentMessages[currentMessages.length - 1].content !== queryText) {
        currentMessages.push({ role: "user" as const, content: queryText });
      }
      
      return [
        ...currentMessages,
        { role: "assistant" as const, content: "Searching documents and generating response..." },
      ];
    });

    try {
      // INTERNAL TRANSLATION: If the query is in Korean, get a quick English version for BETTER SEARCHING
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
            console.log("[SEARCH] Internal Translation:", searchQuery);
          }
        } catch (tErr) {
          console.warn("Translation failed, using original:", tErr);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryText, 
          searchQuery: searchQuery, // Pass the English version for embeddings
          category: selectedCategory 
        }),
      });
      
      const data = await response.json();
      
      // If we found a cached answer in the database, use it immediately
      if (data.cached && data.answer) {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant" as const,
            summary: "Instant answer retrieved from school knowledge base.",
            content: data.answer,
          };
          return newMessages;
        });
        setSources(data.sources || []);
        setIsLoading(false);
        return;
      }

      const contextText = data.context || "";
      let finalAnswerHtml = "";
      
      if (contextText) {
        const prompt = `You are the DIS Information Hub Assistant—an authoritative, helpful, and highly detailed school guide. Your primary mission is to synthesize the provided official school documents into a clear, comprehensive answer.

STRICT LANGUAGE RULE:
- **IDENTIFY THE LANGUAGE** of the "Student Question" first.
- **IF THE QUESTION IS IN ENGLISH:** You MUST respond in English.
- **IF THE QUESTION IS IN KOREAN:** You MUST respond in Korean. 
- NEVER mix languages. If a question is in English, even if the documents are about Korean studies, the final response MUST be English.

CONTENT & STYLE RULES:
- **BE AUTHORITATIVE & DETAILED:** Synthesize all relevant information from the "Document Context." Do not just state a summary—extract **EVERY SPECIFIC DETAIL** (Exact colors like "khaki," "navy blue," "Lands' End," room numbers, materials, and specific times).
- **STRICT GROUNDING:** Base your answers ONLY on the provided documents. If a specific detail is missing, say "The documentation does not specify [X]," but provide all other related details from the context.
- **LOGICAL INFERENCE:** If a question isn't answered verbatim, combine facts from different parts of the context to provide a logical, helpful answer.
- **FORMATTING:** Use bullet points (- item), numbered lists (1. item), and **bold** for key terms, requirements, and policy names.
- **STRUCTURE:** Use "## Headings" to organize long answers.

Document Context:
${contextText}

Student Question:
${queryText}`;

        try {
          if (typeof window !== "undefined" && window.puter) {
             // 1. Start streaming from Puter.js
             const aiResponse = await window.puter.ai.chat(prompt, { 
               model: AI_MODEL_PRIMARY,
               stream: true 
             });

             let fullText = "";
             
             // Iterate through the stream chunks
             for await (const chunk of aiResponse) {
               if (chunk.type === 'text') {
                 fullText += chunk.text;
                 
                 // Render to HTML in real-time for better readability
                 const currentHtml = await marked.parse(fullText);
                 
                 setMessages((prev) => {
                   const newMessages = [...prev];
                   newMessages[newMessages.length - 1] = {
                     role: "assistant" as const,
                     content: currentHtml, 
                   };
                   return newMessages;
                 });
               }
             }

             // 2. Post-processing: Final check for bullets (if AI didn't provide them)
             let text = fullText;
             // Only force bullets if the text is completely flat and long
             const hasBullets = /(^|\n)\s*[-*]\s+/m.test(text) || /(^|\n)\s*\d+\.\s+/m.test(text);

             if (!hasBullets && text.length > 100) {
               const lineSplit = text.split("\n");
               const linesHaveStructure = lineSplit.length > 1;

               const toBullets = (pieces: string[]) =>
                 pieces
                   .map((piece) => {
                     const trimmed = piece.trim();
                     if (!trimmed) return "";
                     if (/^#{1,6}\s+/.test(trimmed)) return trimmed;
                     return `- ${trimmed}`;
                   })
                   .join("\n");

               if (linesHaveStructure) {
                 text = toBullets(lineSplit);
               } else {
                 const sentences = text.split(/(?<=[\.!?])\s+(?=[A-Z0-9])/);
                 if (sentences.length > 1) {
                   text = toBullets(sentences);
                 }
               }
             }

             let html = await marked.parse(text);
             if (!/<ul[\s>]/i.test(html) && !/<ol[\s>]/i.test(html)) {
               const single = fullText.trim();
               if (single) {
                 html = `<ul><li>${single}</li></ul>`;
               }
             }
             finalAnswerHtml = html;

             // 3. Save to server-side cache for future users
             fetch('/api/cache-answer', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 query: queryText,
                 answer: finalAnswerHtml,
                 sources: data.sources,
                 cacheToken: data.cacheToken // Send the secure token back
               }),
             }).catch(err => console.error("Cache save error:", err));

          } else {
             finalAnswerHtml = "AI generation unavailable. Puter requires connection.";
          }
        } catch (aiError) {
          console.error("Puter AI error:", aiError);
          finalAnswerHtml = "Error connecting to AI assistant.";
        }
      } else {
        finalAnswerHtml = "I couldn't find any relevant school documents to answer your question.";
      }
      
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant" as const,
          summary: data.sources && data.sources.length > 0 ? "Here is what I found in the school documents." : undefined,
          content: finalAnswerHtml,
        };
        return newMessages;
      });

      if (data.sources) {
        setSources(data.sources);
      }

      // Update local session cache
      setQueryCache((prev) => ({
        ...prev,
        [cacheKey]: { answer: finalAnswerHtml, sources: data.sources || [] }
      }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant" as const,
          content: "Sorry, I encountered an error searching the documents.",
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery && !initialQueryFired.current) {
      initialQueryFired.current = true;
      submitQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedInput = sanitizeInput(input);
    if (!sanitizedInput || isLoading) return;

    setInput("");
    submitQuery(sanitizedInput);
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
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-border bg-background pt-16 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-full overflow-y-auto p-4">
            <SearchSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setSidebarOpen(false);
              }}
            />
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
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">
                  Ask a Question
                </h2>
                <p className="max-w-md text-muted-foreground">
                  Type your question below to search through official school
                  documents and get accurate answers with sources.
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
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-3xl items-center gap-3"
            >
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
                  This service uses artificial intelligence to process your question and 
                  retrieve relevant passages from official DIS documents. Responses do 
                  not draw from the internet or any external source.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </main>

        {/* Sources Panel */}
        {messages.length > 0 && (
          <aside className="hidden w-80 shrink-0 border-l border-border bg-muted/20 p-4 xl:block">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sources
            </h2>
            <div className="space-y-3">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources found.</p>
              ) : sources.map((source, index) => (
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
