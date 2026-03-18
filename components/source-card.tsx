import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourceCardProps {
  title: string;
  page: number;
  preview: string;
  category: string;
  fileUrl?: string;
}

export function SourceCard({ title, page, preview, category, fileUrl }: SourceCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 hover:-translate-y-1">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
          <FileText className="h-5 w-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground">
            {category}
          </p>
        </div>
      </div>
      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
        {preview}
      </p>
      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full gap-2 transition-all duration-300 hover:scale-[1.02] hover:border-primary hover:bg-primary/5">
            <ExternalLink className="h-4 w-4" />
            Open Document
          </Button>
        </a>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" disabled>
          <ExternalLink className="h-4 w-4" />
          Open Document
        </Button>
      )}
    </div>
  );
}
