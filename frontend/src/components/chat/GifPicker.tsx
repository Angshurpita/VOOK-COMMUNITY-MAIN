import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY as string | undefined;
const TENOR_CLIENT_KEY = (import.meta.env.VITE_TENOR_CLIENT_KEY as string | undefined) || "community-chat";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

type TenorGif = {
  id: string;
  description?: string;
  url: string;
  previewUrl: string;
};

type TenorResponse = {
  results: Array<{
    id: string;
    content_description?: string;
    media_formats?: Record<string, { url: string }>;
  }>;
  next?: string;
};

const categories = [
  "Trending",
  "Happiness",
  "Birthday",
  "Sad",
  "Sorry",
  "Angry",
  "Excited",
  "Love",
  "Funny",
  "Reactions",
  "Dance",
  "Good Morning",
  "Good Night",
  "Celebration"
];

const toTenorGif = (item: TenorResponse["results"][number]): TenorGif | null => {
  const formats = item.media_formats || {};
  const full = formats.gif?.url || formats.mediumgif?.url || formats.tinygif?.url;
  const preview = formats.tinygif?.url || formats.gif?.url || formats.mediumgif?.url;
  if (!full || !preview) return null;
  return {
    id: item.id,
    description: item.content_description,
    url: full,
    previewUrl: preview
  };
};

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Trending");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [nextPos, setNextPos] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const effectiveQuery = searchQuery.trim()
    ? searchQuery.trim()
    : selectedCategory === "Trending"
      ? ""
      : selectedCategory;

  const fetchGifs = useCallback(async (options?: { reset?: boolean }) => {
    if (!TENOR_API_KEY) return;
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        client_key: TENOR_CLIENT_KEY,
        limit: "30",
        media_filter: "gif,tinygif",
        contentfilter: "medium"
      });

      if (!options?.reset && nextPos) {
        params.set("pos", nextPos);
      }

      let endpoint = "https://tenor.googleapis.com/v2/featured";
      if (effectiveQuery) {
        endpoint = "https://tenor.googleapis.com/v2/search";
        params.set("q", effectiveQuery);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load GIFs (${response.status})`);
      }

      const data = (await response.json()) as TenorResponse;
      const mapped = data.results
        .map(toTenorGif)
        .filter((gif): gif is TenorGif => Boolean(gif));

      setGifs((prev) => (options?.reset ? mapped : [...prev, ...mapped]));
      setNextPos(data.next);
    } catch (err: any) {
      setError(err?.message || "Failed to load GIFs");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveQuery, isLoading, nextPos]);

  useEffect(() => {
    setGifs([]);
    setNextPos(undefined);
    if (!TENOR_API_KEY) return;
    fetchGifs({ reset: true });
  }, [effectiveQuery, fetchGifs]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && nextPos && !isLoading) {
          fetchGifs();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchGifs, nextPos, isLoading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-20 left-0 right-0 md:left-auto md:right-4 md:w-[450px] bg-card border border-border rounded-xl shadow-2xl max-h-[60vh] overflow-hidden z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-card z-10 p-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground font-['Outfit'] flex items-center gap-2">
            GIFs <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">TENOR</span>
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${selectedCategory === category && !searchQuery
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-background/50 p-2 min-h-[300px]">
        {!TENOR_API_KEY && (
          <div className="p-4 text-center text-xs text-red-400 bg-red-500/10 rounded my-2 mx-4">
            Warning: Tenor API Key is missing. GIFs will not load.
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-xs text-red-400 bg-red-500/10 rounded my-2 mx-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              className="relative rounded-lg overflow-hidden bg-muted/40 hover:opacity-90 transition"
              onClick={() => onSelect(gif.url)}
              title={gif.description || "GIF"}
            >
              <img
                src={gif.previewUrl}
                alt={gif.description || "GIF"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading more GIFs...
          </div>
        )}

        <div ref={sentinelRef} />
      </div>
    </motion.div>
  );
};

export default GifPicker;
