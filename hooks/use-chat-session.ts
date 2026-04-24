import { useState, useEffect, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  summary?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  sources: any[];
  createdAt: number;
}

const SESSIONS_KEY = "dis-chat-sessions";
const ACTIVE_SESSION_KEY = "dis-active-session";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createNewSession(firstMessage?: string): ChatSession {
  return {
    id: generateId(),
    title: firstMessage ? firstMessage.slice(0, 40) : "New Chat",
    messages: [],
    sources: [],
    createdAt: Date.now(),
  };
}

export function useChatSession(initialQuery?: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
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
        }
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, [initialQuery]);

  // Save to local storage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [sessions, activeSessionId]);

  const startNewChat = useCallback((firstMessage?: string) => {
    const session = createNewSession(firstMessage);
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
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

  const updateActiveSession = useCallback((updates: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, ...updates } : s))
    );
  }, [activeSessionId]);

  const updateSessionById = useCallback((id: string, updates: Partial<ChatSession> | ((s: ChatSession) => ChatSession)) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (typeof updates === "function") return updates(s);
        return { ...s, ...updates };
      })
    );
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  return {
    sessions,
    setSessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    startNewChat,
    switchSession,
    deleteSession,
    updateActiveSession,
    updateSessionById,
  };
}
