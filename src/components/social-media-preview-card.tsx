import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok" | "threads" | "reddit" | "gbp";

export interface GalleryImage {
  src: string;
  alt?: string;
}

export interface SocialMediaPreviewCardProps {
  profileImage?: string | undefined;
  profileName: string;
  timestamp: string | Date;
  content: string;
  images?: GalleryImage[] | undefined;
  platform?: SocialPlatform | undefined;
  likes?: number | undefined;
  comments?: number | undefined;
  shares?: number | undefined;
  isLiked?: boolean | undefined;
  onLike?: (() => void) | undefined;
  onComment?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  onHashtagClick?: ((tag: string) => void) | undefined;
  className?: string | undefined;
  lazyLoad?: boolean | undefined;
  gbpTitle?: string | undefined;
  gbpButtonLabel?: string | undefined;
  gbpCtaLink?: string | undefined;
  gbpIsVerified?: boolean | undefined;
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
  if (!text) return [];

  const regex = /(#\w+|(https?:\/\/[^\s]+))/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const part = match[0];

    if (part.startsWith("#")) {
      const tag = part.slice(1);
      result.push(
        <span
          key={`h${match.index}`}
          role={onTag ? "button" : undefined}
          tabIndex={onTag ? 0 : undefined}
          onClick={(e) => { e.stopPropagation(); onTag?.(tag); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onTag?.(tag); }
          }}
          className={cn("font-semibold text-[#00376b] transition-colors", onTag && "cursor-pointer hover:underline")}
        >
          {part}
        </span>,
      );
    } else if (part.match(/^https?:\/\//)) {
      result.push(
        <a
          key={`u${match.index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00376b] hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>,
      );
    } else {
      result.push(<span key={`p${match.index}`}>{part}</span>);
    }

    lastIndex = match.index + part.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return result;
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

// ─── GBP Preview Card ────────────────────────────────────────────────────────

function GBPPreviewCard({
  profileImage,
  profileName,
  timestamp,
  content,
  images = [],
  gbpTitle,
  gbpButtonLabel,
  gbpIsVerified = true,
  onHashtagClick,
  className,
}: SocialMediaPreviewCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

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
          "mx-auto w-full max-w-[440px] bg-white",
          "rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.1)]",
          "p-4",
          className,
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              {profileImage && <AvatarImage src={profileImage} alt={profileName} />}
              <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white shadow-sm">
              <svg className="h-3.5 w-3.5" viewBox="0 0 48 48">
                <path d="M24 4C18.48 4 14 8.48 14 14v2H12c-2.21 0-4 1.79-4 4v18c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V20c0-2.21-1.79-4-4-4h-2v-2c0-5.52-4.48-10-10-10zm0 4c3.31 0 6 2.69 6 6v2H18v-2c0-3.31 2.69-6 6-6z" fill="#4285F4"/>
                <path d="M8 22h32v18c0 2.21-1.79 4-4 4H12c-2.21 0-4-1.79-4-4V22z" fill="#4285F4"/>
                <path d="M12 22h24v4H12v-4z" fill="#7BAAF7"/>
                <path d="M12 22L8 20v2h4z" fill="#AECBFA"/>
                <path d="M36 22l4-2v2h-4z" fill="#AECBFA"/>
                <text x="24" y="37" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">G</text>
              </svg>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{profileName}</p>
            {gbpIsVerified && (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48">
                <path d="M24 4C18.48 4 14 8.48 14 14v2H12c-2.21 0-4 1.79-4 4v18c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V20c0-2.21-1.79-4-4-4h-2v-2c0-5.52-4.48-10-10-10zm0 4c3.31 0 6 2.69 6 6v2H18v-2c0-3.31 2.69-6 6-6z" fill="#4285F4"/>
                <path d="M8 22h32v18c0 2.21-1.79 4-4 4H12c-2.21 0-4-1.79-4-4V22z" fill="#4285F4"/>
                <path d="M12 22h24v4H12v-4z" fill="#7BAAF7"/>
                <path d="M12 22L8 20v2h4z" fill="#AECBFA"/>
                <path d="M36 22l4-2v2h-4z" fill="#AECBFA"/>
                <text x="24" y="37" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">G</text>
              </svg>
            )}
          </div>
          <button className="rounded-full p-1 text-muted-foreground" aria-label="More options">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>

        {/* ── Gallery (GBP-style 5 photo grid) ────────────────────────── */}
        {images.length > 0 && (
          <GBPGallery images={images} onImageClick={handleImageClick} />
        )}

        {/* ── Caption ─────────────────────────────────────────────────── */}
        {content && (
          <div className="mb-3">
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{parsedContent}</p>
          </div>
        )}

        {/* ── CTA Link ────────────────────────────────────────────────── */}
        {gbpTitle && (
          <div className="mb-3">
            <span className="text-sm text-[#1A73E8] cursor-pointer hover:underline">{gbpTitle}</span>
          </div>
        )}

        {/* ── Button ──────────────────────────────────────────────────── */}
        {gbpButtonLabel && gbpButtonLabel !== "None" && (
          <div className="mb-3">
            <span className="text-sm text-[#1A73E8] font-medium cursor-pointer hover:underline">{gbpButtonLabel}</span>
          </div>
        )}
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

// ─── GBP Gallery (asymmetric layout) ────────────────────────────────────────

function GBPGallery({
  images,
  onImageClick,
}: {
  images: GalleryImage[];
  onImageClick: (i: number) => void;
}) {
  const count = images.length;
  if (count === 0) return null;

  const renderImage = (img: GalleryImage | undefined, i: number, className?: string) => {
    if (!img) return null;
    return (
      <div
        key={i}
        className={cn(
          "relative cursor-pointer overflow-hidden bg-muted rounded-[4px]",
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          onImageClick(i);
        }}
      >
        <img src={img.src} alt={img.alt || `Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  };

  // 1 photo — full width
  if (count === 1) {
    return (
      <div className="mb-3 overflow-hidden rounded-[4px]">
        {renderImage(images[0], 0, "aspect-video w-full")}
      </div>
    );
  }

  // 2 photos — 50/50
  if (count === 2) {
    return (
      <div className="mb-3 grid grid-cols-2 gap-[3px] overflow-hidden rounded-[4px]">
        {renderImage(images[0], 0, "aspect-square")}
        {renderImage(images[1], 1, "aspect-square")}
      </div>
    );
  }

  // 3 photos — left big, right 2 stacked
  if (count === 3) {
    return (
      <div className="mb-3 grid grid-cols-2 gap-[3px] overflow-hidden rounded-[4px]">
        {renderImage(images[0], 0, "row-span-2 aspect-auto h-full")}
        {renderImage(images[1], 1, "aspect-square")}
        {renderImage(images[2], 2, "aspect-square")}
      </div>
    );
  }

  // 4 photos — 2x2
  if (count === 4) {
    return (
      <div className="mb-3 grid grid-cols-2 gap-[3px] overflow-hidden rounded-[4px]">
        {renderImage(images[0], 0, "aspect-square")}
        {renderImage(images[1], 1, "aspect-square")}
        {renderImage(images[2], 2, "aspect-square")}
        {renderImage(images[3], 3, "aspect-square")}
      </div>
    );
  }

  // 5+ photos — GBP asymmetric grid
  return (
    <div className="mb-3 grid grid-cols-5 gap-[3px] overflow-hidden rounded-[4px]">
      {/* Left big photo spanning 3 cols and 2 rows */}
      <div className="col-span-3 row-span-2">
        {renderImage(images[0], 0, "h-full min-h-[140px]")}
      </div>
      {/* Right 2 stacked photos (2 cols each) */}
      <div className="col-span-2">
        {renderImage(images[1], 1, "h-[68px] w-full")}
      </div>
      <div className="col-span-2">
        {renderImage(images[2], 2, "h-[68px] w-full")}
      </div>
      {/* Bottom row: 2 photos */}
      <div className="col-span-3">
        {renderImage(images[3] || images[0], 3, "h-[68px] w-full")}
      </div>
      <div className="col-span-2">
        {renderImage(images[4] || images[1], 4, "h-[68px] w-full")}
      </div>
    </div>
  );
}

// ─── Instagram Preview Card ──────────────────────────────────────────────────

function InstagramPreviewCard({
  profileImage,
  profileName,
  timestamp,
  content,
  images = [],
  platform,
  onHashtagClick,
  className,
}: SocialMediaPreviewCardProps) {
  const [liked, setLiked] = useState(true);
  const [likeCount, setLikeCount] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  const formatInstagramDate = (date: string | Date): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return "JUST NOW";
    if (diffMin < 60) return `${diffMin}H AGO`;
    if (diffHr < 24) return `${diffHr}H AGO`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  };

  return (
    <>
      <article
        className={cn(
          "mx-auto w-full max-w-[470px] bg-white",
          "border-0 rounded-none",
          className,
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              {profileImage && <AvatarImage src={profileImage} alt={profileName} />}
              <AvatarFallback className="bg-muted text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {platform && (
              <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white shadow-sm">
                <PlatformBadgeIcon platform={platform} className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight">{profileName}</p>
          </div>
          <button className="rounded-full p-1 text-muted-foreground" aria-label="More options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* ── Gallery (Instagram-style 5 photo grid) ────────────────── */}
        {images.length > 0 && (
          <InstagramGallery images={images} onImageClick={handleImageClick} />
        )}

        {/* ── Action Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4">
            <button
              className={cn("transition-colors", liked ? "text-[#ED4956]" : "text-foreground")}
              aria-label="Like"
              onClick={() => {
                setLiked((p) => !p);
                setLikeCount((p) => (liked ? p - 1 : p + 1));
              }}
            >
              {liked ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
            </button>
            <button className="text-foreground" aria-label="Comment">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
            </button>
            <button className="text-foreground" aria-label="Share">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <button className="text-foreground" aria-label="Save">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        </div>

        {/* ── Like Count ──────────────────────────────────────────────── */}
        {likeCount > 0 && (
          <div className="px-3 pb-1">
            <span className="text-[13px] font-semibold">{likeCount} like{likeCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* ── Caption ─────────────────────────────────────────────────── */}
        <div className="px-3 pb-1">
          <p className="whitespace-pre-wrap text-[13px] leading-snug">
            <span className="font-semibold">{profileName}</span>{" "}
            <span className="text-foreground">{parsedContent}</span>
          </p>
        </div>

        {/* ── Timestamp ──────────────────────────────────────────────── */}
        <div className="px-3 pb-3">
          <time
            dateTime={typeof timestamp === "string" ? timestamp : timestamp.toISOString()}
            className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {formatInstagramDate(timestamp)}
          </time>
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

// ─── Instagram Gallery (5-photo layout) ─────────────────────────────────────

function InstagramGallery({
  images,
  onImageClick,
}: {
  images: GalleryImage[];
  onImageClick: (i: number) => void;
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
        <img src={img.src} alt={img.alt || `Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  };

  // 1 photo — full width
  if (count === 1) {
    return (
      <div className="overflow-hidden">
        {renderImage(images[0], 0, "aspect-square w-full")}
      </div>
    );
  }

  // 2 photos — 50/50
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-[2px] overflow-hidden">
        {renderImage(images[0], 0, "aspect-square")}
        {renderImage(images[1], 1, "aspect-square")}
      </div>
    );
  }

  // 3 photos — first big left, 2 stacked right
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-[2px] overflow-hidden">
        {renderImage(images[0], 0, "row-span-2 aspect-auto h-full")}
        {renderImage(images[1], 1, "aspect-square")}
        {renderImage(images[2], 2, "aspect-square")}
      </div>
    );
  }

  // 4 photos — 2x2
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-[2px] overflow-hidden">
        {renderImage(images[0], 0, "aspect-square")}
        {renderImage(images[1], 1, "aspect-square")}
        {renderImage(images[2], 2, "aspect-square")}
        {renderImage(images[3], 3, "aspect-square")}
      </div>
    );
  }

  // 5+ photos — Instagram-style grid
  return (
    <div className="grid grid-cols-2 gap-[2px] overflow-hidden">
      {/* Row 1: left big, right 2 stacked */}
      <div className="row-span-2">
        {renderImage(images[0], 0, "h-full")}
      </div>
      <div className="h-1/2">
        {renderImage(images[1], 1, "h-full")}
      </div>
      <div className="h-1/2">
        {renderImage(images[2], 2, "h-full")}
      </div>
      {/* Row 2 continued: 2 more photos */}
      {count > 3 && (
        <>
          <div>
            {renderImage(images[3], 3, "aspect-square")}
          </div>
          <div className="relative">
            {renderImage(images[4] || images[3], 4, "aspect-square")}
            {count > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-xl font-bold text-white">+{count - 5}</span>
              </div>
            )}
          </div>
        </>
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
  platform,
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
  gbpTitle,
  gbpButtonLabel,
  gbpIsVerified,
}: SocialMediaPreviewCardProps) {
  // Route to Instagram preview if platform is instagram
  if (platform === "instagram") {
    return (
      <InstagramPreviewCard
        profileImage={profileImage}
        profileName={profileName}
        timestamp={timestamp}
        content={content}
        images={images}
        platform={platform}
        onHashtagClick={onHashtagClick}
        className={className}
      />
    );
  }

  // Route to GBP preview if platform is gbp
  if (platform === "gbp") {
    return (
      <GBPPreviewCard
        profileImage={profileImage}
        profileName={profileName}
        timestamp={timestamp}
        content={content}
        images={images}
        platform={platform}
        gbpTitle={gbpTitle}
        gbpButtonLabel={gbpButtonLabel}
        gbpIsVerified={gbpIsVerified}
        onHashtagClick={onHashtagClick}
        className={className}
      />
    );
  }

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
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {profileImage && <AvatarImage src={profileImage} alt={profileName} />}
              <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {platform && (
              <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white shadow-sm">
                <PlatformBadgeIcon platform={platform} className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">{profileName}</p>
            <time
              dateTime={typeof timestamp === "string" ? timestamp : timestamp.toISOString()}
              className="text-[11px] text-muted-foreground"
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
          <div className="px-4 py-2.5">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{parsedContent}</p>
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
        <div className="flex items-center px-1.5 py-0.5">
          <ActionButton
            icon={<ThumbsUp className={cn("h-4 w-4", liked && "fill-[#1877F2] text-[#1877F2]")} />}
            label="Like"
            isActive={liked}
            onClick={handleLike}
          />
          <ActionButton
            icon={<MessageCircle className="h-4 w-4" />}
            label="Comment"
            onClick={onComment}
          />
          <ActionButton
            icon={<Share2 className="h-4 w-4" />}
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

// ─── Platform Badge Icons ────────────────────────────────────────────────────

function PlatformBadgeIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  switch (platform) {
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#E4405F">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#000000">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case "tiktok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#000000">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.18z"/>
        </svg>
      );
    case "threads":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#000000">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-3.454 6.54-1.887 1.22-4.137 1.374-5.67.43-1.538-.948-2.307-2.724-2.184-4.77.104-1.715.96-3.2 2.48-4.318 1.375-1.013 3.013-1.52 4.804-1.51l.02 1.723c-1.18-.014-2.2.34-3.015 1.053-.87.76-1.336 1.786-1.39 2.97-.055 1.2.38 2.24 1.28 3.01.748.64 1.71.96 2.84.96.46 0 .89-.06 1.29-.18.68-.2 1.24-.53 1.65-1 .39-.44.64-.98.74-1.61.09-.57.06-1.18-.09-1.83-.15-.65-.42-1.23-.81-1.73-.37-.47-.82-.84-1.34-1.1-.5-.25-1.04-.4-1.62-.44l-.02-1.74c.97-.04 1.88.17 2.7.62.85.46 1.53 1.1 2.03 1.91.51.83.84 1.79.97 2.87.15 1.23.09 2.43-.2 3.57-.5 1.95-1.6 3.52-3.24 4.63-1.66 1.12-3.66 1.71-6.07 1.77z"/>
        </svg>
      );
    case "reddit":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#FF4500">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.82.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#6B7280">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      );
  }
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

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
        "flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded px-2 py-1.5 min-w-0",
        "text-xs font-medium text-foreground transition-colors duration-150",
        "hover:bg-accent",
        "active:scale-[0.97]",
        isActive && "text-[#1877F2]",
      )}
    >
      <span className="relative shrink-0">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
