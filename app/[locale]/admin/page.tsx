"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Search,
  Send,
  HelpCircle,
  FileCheck,
  TrendingUp,
  CheckCircle2,
  Clock,
  LogOut,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, Suspense } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, UserPlus, ShieldPlus } from "lucide-react";

// Security: Input validation constants
const MAX_QUESTION_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 200;
const ALLOWED_FILE_TYPES = [".pdf", ".doc", ".docx", ".txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Sanitize user input
function sanitizeInput(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>{}]/g, "");
}

// Validate file type and size
function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_FILE_TYPES.includes(extension)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }
  return { valid: true };
}



const categories = [
  "Handbook",
  "Policies",
  "Academics",
  "Events",
  "Clubs",
  "Announcements",
];

function sanitizeHtmlResponse(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br", "span", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
  });
}

export default function AdminPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Handbook");
  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [description, setDescription] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Real Data State
  const [documents, setDocuments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [topQuestionsList, setTopQuestionsList] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const router = useRouter();

  const SUPER_ADMIN = 'osongfivestar@gmail.com';

  // Fetch data on load
  const fetchData = async (email?: string) => {
    setIsLoadingDocs(true);
    const supabase = createClient();
    const currentEmail = email || userEmail;

    // Fetch docs
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!docsError && docs) {
      setDocuments(docs);
    }

    // Fetch queries for top questions aggregation
    const { data: queries } = await supabase
      .from('search_queries')
      .select('query');

    if (queries) {
      setTotalQuestions(queries.length);
      const counts: Record<string, number> = {};
      queries.forEach(q => {
        counts[q.query] = (counts[q.query] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopQuestionsList(sorted);
    }

    // Fetch requests ONLY if Super Admin
    if (currentEmail === SUPER_ADMIN) {
      const { data: reqs } = await supabase
        .from('admin_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqs) {
        setRequests(reqs);
      }
    }

    // Fetch 5 most recent upcoming calendar events
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);
    setCalendarEvents(events || []);

    setIsLoadingDocs(false);
  };

  useEffect(() => {
    const supabase = createClient();

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth/login");
      } else {
        setUserEmail(session.user.email || null);
        fetchData(session.user.email);
      }
      setIsInitialLoading(false);
    });

    // Listen for auth changes to KEEP LOGGED IN (Persistence)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserEmail(session.user.email || null);
        // Only re-fetch if we transitioned from no-email to having-email
        if (!userEmail) fetchData(session.user.email);
      } else if (!isInitialLoading) {
        // ONLY redirect if we are sure the initial check is done and failed
        setUserEmail(null);
        router.push("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, userEmail, isInitialLoading]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const file = files[0]; // just uploading one file for now

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }

    await uploadFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    const supabase = createClient();

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const safeCategory = selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filePath = `${safeCategory}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 2. Insert into DB
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          description: description || null,
          category: selectedCategory,
          file_url: publicUrlData.publicUrl,
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Call API to process/chunk the document
      setDescription("");
      fetchData(); // Refresh list to show processing state immediately

      fetch('/api/process-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docData.id, fileUrl: publicUrlData.publicUrl })
      }).then(() => {
        fetchData(); // Refresh again once processing returns (it might take a bit)
      });

    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedQuestion = sanitizeInput(testQuestion, MAX_QUESTION_LENGTH);
    if (!sanitizedQuestion || isTesting) return;
    setIsTesting(true);
    setTestAnswer("Searching documents...");

    try {
      // Call the /api/chat backend for context retrieval
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sanitizedQuestion }),
      });
      const data = await response.json();
      const contextText = data.context || "";

      if (!contextText) {
        setTestAnswer("No relevant documents found for this question.");
      } else if (typeof window !== "undefined" && (window as any).puter) {
        const prompt = `You are an authoritative and helpful school information assistant. Your goal is to provide comprehensive, accurate answers by synthesizing the official documents provided.

RULES:
- Base answers on the document context. Stay grounded in facts, but make logical inferences and combine multiple pieces of information to provide a complete answer.
- If a question isn't answered verbatim, look for related policies and explain how they logically apply.
- Be SPECIFIC and DETAILED with exact policies, numbers, and consequences.
- Use bullet points (- item) and numbered lists (1. item) extensively for readability.
- Use **bold** for key terms, policy names, and important details.
- Speak definitively: "The policy states..." or "Based on the handbook guidelines..."
- If specific consequences or requirements are present, LIST ALL OF THEM.

Document Context:
${contextText}

Question:
${sanitizedQuestion}`;
        const aiResponse = await (window as any).puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
        const rawText = aiResponse?.message?.content || "No response generated.";
        let text = rawText;
        const hasBullets =
          /(^|\n)\s*[-*]\s+/m.test(text) ||
          /(^|\n)\s*\d+\.\s+/m.test(text);

        if (!hasBullets) {
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
          const single = rawText.trim();
          if (single) {
            html = `<ul><li>${single}</li></ul>`;
          }
        }
        setTestAnswer(sanitizeHtmlResponse(html));
      } else {
        setTestAnswer("AI unavailable. Puter.js is not loaded.");
      }
    } catch (err: any) {
      setTestAnswer("Error: " + (err.message || "Failed to get response"));
    } finally {
      setIsTesting(false);
    }
  };

  const handleManageRequest = async (requestId: string, action: 'approve' | 'deny') => {
    try {
      const response = await fetch('/api/admin/manage-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');

      toast.success(`Request ${action === 'approve' ? 'approved' : 'denied'} successfully`);
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_QUESTION_LENGTH) {
      setTestQuestion(value);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  const syncCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.count} events!`);
        // Refresh events
        const supabase = createClient();
        const { data: events } = await supabase
          .from('calendar_events')
          .select('*')
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);
        setCalendarEvents(events || []);
      } else {
        toast.error(data.error || data.message || "Sync failed");
      }
    } catch (e) {
      toast.error("Network error during sync");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">Verifying Secure Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Upload documents, manage your library, and test the AI search
                functionality.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2 self-start"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content - Upload and Document Management */}
            <div className="space-y-8 lg:col-span-2">
              {/* Upload Section */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Upload Documents
                </h2>

                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mb-1 text-base font-medium text-foreground">
                    Drag and drop files here
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    or click to browse from your computer
                  </p>
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>Browse Files</span>
                    </Button>
                    <input type="file" className="hidden" onChange={handleFileSelect} accept={ALLOWED_FILE_TYPES.join(',')} />
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Allowed: PDF, DOC, DOCX, TXT (max 10MB)
                  </p>
                  {uploadError && (
                    <p className="mt-2 text-sm text-destructive">{uploadError}</p>
                  )}
                </div>

                {/* Upload Form */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={handleDescriptionChange}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      autoComplete="off"
                      placeholder="Brief description of the document"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <Button
                  className="mt-4 w-full gap-2 sm:w-auto"
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </section>

              {/* User Management Section (Super Admin Only) */}
              {userEmail === SUPER_ADMIN && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <Card className="bg-muted/30 border-border text-foreground overflow-hidden backdrop-blur-sm">
                    <div className="p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <ShieldPlus className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Admin Privileges</h3>
                          <p className="text-sm text-muted-foreground">Manage administrative access</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push('/auth/request-admin')}
                        variant="outline"
                        className="w-full bg-background border-border hover:bg-muted text-foreground mt-4"
                      >
                        View Pending Requests ({requests.length})
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Calendar Sync Card */}
                  <Card className="bg-muted/30 border-border text-foreground overflow-hidden backdrop-blur-sm">
                    <div className="p-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Calendar Synchronization</h3>
                          <p className="text-sm text-muted-foreground">Sync official school events live</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        {calendarEvents.length > 0 ? (
                          calendarEvents.map((event, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50 text-xs">
                              <span className="font-medium truncate max-w-[150px]">{event.title}</span>
                              <span className="text-muted-foreground">{new Date(event.start_time).toLocaleDateString()}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4 italic">No upcoming events synced yet.</p>
                        )}
                      </div>

                      <Button
                        onClick={syncCalendar}
                        disabled={isSyncingCalendar}
                        className="w-full bg-green-600/10 border-green-600/20 hover:bg-green-600/20 text-green-600 font-semibold"
                      >
                        {isSyncingCalendar ? "Syncing..." : "Sync School Calendar Now"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Access Requests Management (Super Admin ONLY) */}
              {userEmail === SUPER_ADMIN && requests.some(r => r.status === 'pending') && (
                <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <UserPlus className="h-24 w-24" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="rounded-full bg-destructive/10 p-2">
                      <ShieldPlus className="h-5 w-5 text-destructive" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Pending Access Requests
                    </h2>
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Action Required
                    </span>
                  </div>

                  <div className="space-y-4 relative z-10">
                    {requests.filter(r => r.status === 'pending').map((req) => (
                      <Card key={req.id} className="border-border/50 bg-background/50 backdrop-blur-sm">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{req.name}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground font-mono">{req.email}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 italic">
                              "{req.reason}"
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Submitted {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleManageRequest(req.id, 'deny')}
                            >
                              Deny
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-green-600 hover:bg-green-700 text-foreground border-none"
                              onClick={() => handleManageRequest(req.id, 'approve')}
                            >
                              Approve & Notify
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Document Management Table */}
              <section className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Document Management
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                          Document Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                          Upload Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoadingDocs ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                            Loading documents...
                          </td>
                        </tr>
                      ) : documents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                            No documents found.
                          </td>
                        </tr>
                      ) : documents.map((doc, index) => (
                        <tr key={index} className="hover:bg-muted/20">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {doc.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {doc.category}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {doc.status === "indexed" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Indexed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                <Clock className="h-3.5 w-3.5" />
                                {doc.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this document?')) {
                                    const supabase = createClient();
                                    await supabase.from('documents').delete().eq('id', doc.id);
                                    fetchData();
                                  }
                                }}
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Test Question Panel */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Test Question
                  </h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Test if your documents are being indexed correctly by asking a
                  question.
                </p>

                <form onSubmit={handleTestQuestion} className="mb-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={testQuestion}
                        onChange={handleQuestionChange}
                        maxLength={MAX_QUESTION_LENGTH}
                        autoComplete="off"
                        placeholder="When are finals scheduled?"
                        className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <Button type="submit" className="gap-2">
                      <Send className="h-4 w-4" />
                      Test
                    </Button>
                  </div>
                </form>

                {testAnswer && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        AI Response
                      </span>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: testAnswer }}
                    />
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar - Analytics */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Questions</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{totalQuestions.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All time
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">Documents</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{documents.filter(d => d.status === 'indexed').length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Indexed documents
                  </p>
                </div>
              </div>

              {/* Top Questions */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Top Questions This Week
                  </h3>
                </div>
                <ul className="space-y-3">
                  {topQuestionsList.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No queries yet.</li>
                  ) : topQuestionsList.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground">
                          {item.question}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {item.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Most Used Documents */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    All Documents
                  </h3>
                </div>
                <ul className="space-y-3">
                  {documents.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No documents yet.</li>
                  ) : documents.map((doc, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate max-w-[160px]">
                        {doc.title}
                      </span>
                      <span className={cn(
                        "text-xs rounded-full px-2 py-0.5",
                        doc.status === 'indexed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {doc.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
