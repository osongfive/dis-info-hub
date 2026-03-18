import { FileText, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  title: string;
  description: string;
  category: string;
  uploadDate: string;
  className?: string;
}

const categoryColors: Record<string, string> = {
  Handbook: "bg-blue-100 text-blue-700",
  Policies: "bg-amber-100 text-amber-700",
  Academics: "bg-green-100 text-green-700",
  Events: "bg-pink-100 text-pink-700",
  Clubs: "bg-purple-100 text-purple-700",
  Announcements: "bg-orange-100 text-orange-700",
};

export function DocumentCard({
  title,
  description,
  category,
  uploadDate,
  className,
}: DocumentCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 hover:-translate-y-1",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
          <FileText className="h-6 w-6 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
            {title}
          </h3>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
              categoryColors[category] || "bg-secondary text-muted-foreground"
            )}
          >
            {category}
          </span>
        </div>
      </div>

      <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {description}
      </p>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{uploadDate}</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary/5">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  );
}
