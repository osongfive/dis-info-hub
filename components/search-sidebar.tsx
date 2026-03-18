"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Calendar,
  Megaphone,
  ChevronRight,
} from "lucide-react";

const categories = [
  { id: "all", label: "All Documents", icon: BookOpen },
  { id: "Handbook", label: "Handbook", icon: BookOpen },
  { id: "Policies", label: "Policies", icon: GraduationCap },
  { id: "Academics", label: "Academics", icon: Award },
  { id: "Events", label: "Events", icon: Calendar },
  { id: "Clubs", label: "Clubs", icon: Users },
  { id: "Announcements", label: "Announcements", icon: Megaphone },
];

interface SearchSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export function SearchSidebar({
  selectedCategory,
  onCategoryChange,
  className,
}: SearchSidebarProps) {
  return (
    <aside className={cn("space-y-2", className)}>
      <h2 className="mb-4 px-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Document Categories
      </h2>
      <nav className="space-y-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              selectedCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <category.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{category.label}</span>
            {selectedCategory === category.id && (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
