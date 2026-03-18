"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  size?: "default" | "large";
  className?: string;
}

// Input validation constants
const MAX_QUERY_LENGTH = 500;
const SANITIZE_PATTERN = /[<>{}]/g; // Remove potential injection characters

// Sanitize and validate user input
function sanitizeQuery(input: string): string {
  return input
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .replace(SANITIZE_PATTERN, "");
}

export function SearchBar({
  placeholder = "How many service hours are required to graduate?",
  size = "default",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limit input length on the client side
    if (value.length <= MAX_QUERY_LENGTH) {
      setQuery(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedQuery = sanitizeQuery(query);
    if (sanitizedQuery) {
      router.push(`/search?q=${encodeURIComponent(sanitizedQuery)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div
        className={`group relative flex items-center rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 ease-out focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:shadow-lg hover:scale-[1.01] hover:border-primary/30 ${
          size === "large" ? "px-5 py-4" : "px-4 py-3"
        }`}
      >
        <Search
          className={`shrink-0 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary ${
            size === "large" ? "h-6 w-6" : "h-5 w-5"
          }`}
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          className={`flex-1 bg-transparent px-3 text-foreground placeholder:text-muted-foreground focus:outline-none ${
            size === "large" ? "text-lg" : "text-base"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-xl bg-primary font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:scale-105 hover:shadow-md active:scale-95 ${
            size === "large" ? "px-6 py-2.5 text-base" : "px-4 py-2 text-sm"
          }`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
