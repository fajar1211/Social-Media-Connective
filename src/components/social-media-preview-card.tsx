import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "linkedin";

export interface GalleryImage {
  src: string;
  alt?: string;
}

export interface SocialMediaPreviewCardProps {
  profileImage?: string;
  profileName: string;
  timestamp: string | Date;
  content: string;
  images?: GalleryImage[];
  platform?: SocialPlatform;
  likes?: number;
  comments?: number;
  shares?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onHashtagClick?: (tag: string) => void;
  className?: string;
  lazyLoad?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseContent(
  text: string,
  onTag: ((tag: string) => void) | undefined,
): React.ReactNode[] {
  // Match hashtags and URLs
  const regex = /(#\w+|(https?:\/\/[^\s]+))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Hashtag
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <span
          key={i}
          role={onTag ? "button" : undefined}
          tabIndex={onTag ? 0 : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onTag?.(tag);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onTag?.(tag);
            }
          }}
          className={cn(
            "font-semibold text-[#1877F2] transition-colors",
            onTag && "cursor-pointer hover:underline",
          )}
        >
          {part}
        </span>
      );
    }

    // URL
    if (part.match(/^https?:\/\//)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1877F2] hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

// ─── LazyImage ───────────────────────────────────────────────────────────────

function LazyImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt || ""}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

// ─── Gallery (Facebook-style layout) ─────────────────────────────────────────

function Gallery({
  images,
  onImageClick,
  lazyLoad = true,
}: {
  images: GalleryImage[];
  onImageClick: (i: number) => void;
  lazyLoad?: boolean;
}) {
  const count = images.length;
  if (count === 0) return null;

  const renderImage = (img: GalleryImage | undefined, i: number, className?: string) => {
    if (!img) return null;
    return (
      <div
        key={i}
        className={cn(
          "relative cursor-pointer overflow-hidden bg-muted",
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          onImageClick(i);
        }}
      >
        {lazyLoad ? (
          <LazyImage src={img.src} alt={img.alt || `Photo ${i + 1}`} className="h-full w-full object-cover" />
        ) : (
          <img src={img.src} alt={img.alt || `Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 hover:bg-black/10" />
      </div>
    );
  };

  // 1 photo — full width
  if (count === 1) {
    return (
      <div className="overflow-hidden">
        {renderImage(images[0], 0, "aspect-video w-full")}
      </div>
    );
  }

  // 2 photos — 50/50 side by side
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-[3px] overflow-hidden">
        {renderImage(images[0], 0, "aspect-square")}
        {renderImage(images[1], 1, "aspect-square")}
      </div>
    );
  }

  // 3 photos — left full height, right 2 stacked
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-[3px] overflow-hidden">
        {renderImage(images[0], 0, "row-span-2 aspect-auto h-full")}
        {renderImage(images[1], 1, "aspect-square")}
        {renderImage(images[2], 2, "aspect-square")}
      </div>
    );
  }

  // 4+ photos — 2x2 grid
  const visible = images.slice(0, 4);
  const remaining = count - 4;

  return (
    <div className="grid grid-cols-2 gap-[3px] overflow-hidden">
      {visible.map((img, i) =>
        i === 3 && remaining > 0 ? (
          <div key={i} className="relative aspect-square cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(i)}>
            {lazyLoad ? (
              <LazyImage src={img.src} alt={img.alt || `Photo ${i + 1}`} className="h-full w-full object-cover" />
            ) : (
              <img src={img.src} alt={img.alt || `Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-2xl font-bold text-white drop-shadow">+{remaining}</span>
            </div>
          </div>
        ) : (
          renderImage(img, i, "aspect-square")
        ),
      )}
    </div>
  );
}

// ─── Image Preview Modal ─────────────────────────────────────────────────────

function ImagePreviewModal({
  images,
  initialIndex,
  isOpen,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1));
      if (e.key === "ArrowRight") setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0));
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1)); }}
          className="absolute left-4 z-50 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Previous"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <img
        key={currentIndex}
        src={currentImage.src}
        alt={currentImage.alt || `Photo ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0)); }}
          className="absolute right-4 z-50 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Next"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SocialMediaPreviewCard({
  profileImage,
  profileName,
  timestamp,
  content,
  images = [],
  likes = 0,
  comments = 0,
  shares = 0,
  isLiked = false,
  onLike,
  onComment,
  onShare,
  onHashtagClick,
  className,
  lazyLoad = true,
}: SocialMediaPreviewCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleLike = useCallback(() => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
    onLike?.();
  }, [liked, onLike]);

  const handleImageClick = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  }, []);

  const parsedContent = useMemo(
    () => parseContent(content, onHashtagClick),
    [content, onHashtagClick],
  );

  const initials = useMemo(() => {
    return profileName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profileName]);

  return (
    <>
      <article
        className={cn(
          "mx-auto w-full max-w-[540px] rounded-xl border border-border bg-card text-card-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
          className,
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <Avatar className="h-10 w-10 shrink-0">
            {profileImage && <AvatarImage src={profileImage} alt={profileName} />}
            <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight">{profileName}</p>
            <time
              dateTime={typeof timestamp === "string" ? timestamp : timestamp.toISOString()}
              className="text-xs text-muted-foreground"
            >
              {formatDate(timestamp)}
            </time>
          </div>

          <button className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent" aria-label="More options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* ── Header Divider ─────────────────────────────────────────── */}
        <div className="mx-4 border-t border-border" />

        {/* ── Content ────────────────────────────────────────────────── */}
        {content && (
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{parsedContent}</p>
          </div>
        )}

        {/* ── Gallery ────────────────────────────────────────────────── */}
        {images.length > 0 && (
          <Gallery images={images} onImageClick={handleImageClick} lazyLoad={lazyLoad} />
        )}

        {/* ── Stats ──────────────────────────────────────────────────── */}
        {(likeCount > 0 || comments > 0 || shares > 0) && (
          <>
            <div className="mx-4 mt-3 border-t border-border" />
            <div className="flex items-center justify-between px-4 py-2 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {liked && (
                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1877F2]">
                    <ThumbsUp className="h-2.5 w-2.5 text-white" fill="currentColor" />
                  </span>
                )}
                {likeCount > 0 && <span>{likeCount}</span>}
              </div>
              <div className="flex gap-3">
                {comments > 0 && <span>{comments} comment{comments !== 1 ? "s" : ""}</span>}
                {shares > 0 && <span>{shares} share{shares !== 1 ? "s" : ""}</span>}
              </div>
            </div>
          </>
        )}

        {/* ── Action Divider ─────────────────────────────────────────── */}
        <div className="mx-4 border-t border-border" />

        {/* ── Footer Actions ─────────────────────────────────────────── */}
        <div className="flex items-center px-2 py-1">
          <ActionButton
            icon={<ThumbsUp className={cn("h-5 w-5", liked && "fill-[#1877F2] text-[#1877F2]")} />}
            label="Like"
            isActive={liked}
            onClick={handleLike}
          />
          <ActionButton
            icon={<MessageCircle className="h-5 w-5" />}
            label="Comment"
            onClick={onComment}
          />
          <ActionButton
            icon={<Share2 className="h-5 w-5" />}
            label="Share"
            onClick={onShare}
          />
        </div>
      </article>

      <ImagePreviewModal
        images={images}
        initialIndex={previewIndex}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

// ─── Action Button ───────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: (() => void) | undefined;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-md px-2 py-2 min-w-0",
        "text-[13px] sm:text-[15px] font-medium text-muted-foreground transition-colors duration-150",
        "hover:bg-accent",
        "active:scale-[0.97]",
        isActive && "text-[#1877F2]",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
