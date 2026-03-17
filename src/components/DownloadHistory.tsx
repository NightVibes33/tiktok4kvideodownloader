import { Clock, Trash2, X, RotateCcw } from "lucide-react";
import type { DownloadHistoryItem } from "@/hooks/use-download-history";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  history: DownloadHistoryItem[];
  onReuse: (url: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function DownloadHistory({ history, onReuse, onRemove, onClear }: Props) {
  if (history.length === 0) return null;

  return (
    <section className="space-y-3 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-heading flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Recent Downloads
        </h2>
        <button
          onClick={onClear}
          className="text-[10px] text-dim hover:text-destructive font-mono uppercase tracking-wider flex items-center gap-1 transition-colors duration-200"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 ring-1 ring-border/50 group hover:ring-primary/20 transition-all duration-200"
          >
            {item.cover && (
              <img
                src={item.cover}
                alt=""
                className="w-10 h-14 rounded-lg object-cover shrink-0 bg-secondary"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-heading truncate">
                @{item.author}
              </p>
              {item.description && (
                <p className="text-[11px] text-dim truncate mt-0.5">
                  {item.description}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                {timeAgo(item.downloadedAt)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onReuse(item.url)}
                className="p-2 rounded-lg text-dim hover:text-primary hover:bg-primary/10 transition-colors duration-200"
                title="Re-download"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="p-2 rounded-lg text-dim hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
