"use client";

import { Navbar } from "@/components/navbar";
import { DocumentCard } from "@/components/document-card";
import { Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "All",
  "Handbook",
  "Policies",
  "Academics",
  "Events",
  "Clubs",
  "Announcements",
];

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "indexed")
        .order("created_at", { ascending: false });

      if (data && !error) {
        setDocuments(data);
      }
      setIsLoading(false);
    };

    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    const titleMatch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || descMatch;
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Document Library
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse and search through official school documents, handbooks,
              and policies.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Category Filter - Desktop */}
            <div className="hidden items-center gap-2 sm:flex">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Filter - Mobile */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 sm:hidden">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="mb-6 text-sm text-muted-foreground">
            {isLoading ? "Loading documents..." : `Showing ${filteredDocuments.length} of ${documents.length} documents`}
          </p>

          {/* Document Grid */}
          {filteredDocuments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc, index) => (
                <a href={doc.file_url} target="_blank" rel="noreferrer" key={doc.id || index} className="block transition-transform hover:-translate-y-1">
                  <DocumentCard
                    title={doc.title}
                    description={doc.description || ""}
                    category={doc.category}
                    uploadDate={new Date(doc.created_at).toLocaleDateString()}
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-1 text-lg font-medium text-foreground">
                No documents found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
