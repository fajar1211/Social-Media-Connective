import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Image, Film, Upload, Send, CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { actions, formatDate, useStore, type ContentItem, type FacebookPage } from "@/lib/content-store";
import { ContentTypeBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { SocialMediaPreviewCard } from "@/components/social-media-preview-card";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function ReplaceMediaSection({
  draft,
  setDraft,
  setPendingFile,
}: {
  draft: ContentItem;
  setDraft: (d: ContentItem) => void;
  setPendingFile: (f: File | null) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiMediaType, setAiMediaType] = useState<"image" | "video">(
    draft.type === "Short Video" ? "video" : "image"
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [gbpImageUrl, setGbpImageUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setDraft({ ...draft, media: [blobUrl] });
    setPendingFile(file);
  };

  const generateAiImage = async () => {
    const prompt = aiPrompt.trim() || draft.title;
    if (!prompt) {
      toast.error("Enter a prompt to generate image.");
      return;
    }
    setAiLoading(true);
    try {
      if (draft.type === "Carousel") {
        const resp = await fetch("/api/ai/generate-carousel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompts: [prompt, prompt, prompt],
            style: "photorealistic",
          }),
        });
        if (!resp.ok) throw new Error("Generation failed");
        const data = await resp.json();
        if (data.success && data.images?.length > 0) {
          setDraft({ ...draft, media: [data.images[0].image_url] });
          toast.success(`Generated ${data.images.length} carousel images!`);
        } else {
          throw new Error(data.error || "Generation failed");
        }
      } else {
        const payload: Record<string, unknown> = {
          prompt,
          style: "photorealistic",
        };
        if (referenceImage) payload["reference_image"] = referenceImage;
        if (gbpImageUrl) payload["gbp_url"] = gbpImageUrl;

        const resp = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error("Generation failed");
        const data = await resp.json();
        if (data.success && data.image_url) {
          setDraft({ ...draft, media: [data.image_url] });
          toast.success("Image generated!");
        } else {
          throw new Error(data.error || "Generation failed");
        }
      }
    } catch {
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <Label className="text-xs font-medium">Replace Image/Video</Label>

      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={() => imageInputRef.current?.click()} disabled={aiLoading}>
          <Upload className="mr-1.5 size-3.5" />
          {aiLoading ? "Uploading..." : "Upload Image/Video"}
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAiGen((p) => !p)} disabled={aiLoading}>
          <svg className="mr-1.5 size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          AI Generate Image/Video
        </Button>
      </div>

      {/* AI Generation Panel */}
      {showAiGen && (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          {/* Media Type Tabs */}
          <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => { setAiMediaType("image"); if (draft.type === "Short Video") setDraft({ ...draft, type: "Image" }); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                aiMediaType === "image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="size-3.5" />
              Image
            </button>
            <button
              type="button"
              onClick={() => { setAiMediaType("video"); if (draft.type !== "Short Video") setDraft({ ...draft, type: "Short Video" }); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                aiMediaType === "video" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="size-3.5" />
              Video
            </button>
          </div>

          {/* Image Type Options */}
          {aiMediaType === "image" && (
            <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, type: "Image" })}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  draft.type === "Image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Single Image
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, type: "Carousel" })}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  draft.type === "Carousel" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Carousel
              </button>
            </div>
          )}

          {/* Video Orientation Options */}
          {aiMediaType === "video" && (
            <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, notes: "orientation:vertical" })}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  draft.notes !== "orientation:horizontal" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Vertical
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, notes: "orientation:horizontal" })}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  draft.notes === "orientation:horizontal" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Horizontal
              </button>
            </div>
          )}

          <Label className="text-xs text-muted-foreground">Reference Image (optional) OR Url GBP</Label>
          <div
            className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setReferenceImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              };
              input.click();
            }}
          >
            {referenceImage ? (
              <>
                <img src={referenceImage} alt="Reference" referrerPolicy="no-referrer" className="h-8 w-8 rounded object-cover shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate flex-1">Reference uploaded</span>
              </>
            ) : (
              <>
                <Image className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-[10px] text-muted-foreground">Click to upload reference image</span>
              </>
            )}
          </div>
          <Input
            type="url"
            value={gbpImageUrl}
            onChange={(e) => setGbpImageUrl(e.target.value)}
            placeholder="Or paste GBP image URL..."
            className="text-xs h-8"
          />
          <Textarea
            rows={2}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={`${aiMediaType === "video" ? "Video" : "Image"} prompt (used to generate)...`}
            className="text-xs"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={generateAiImage}
            disabled={aiLoading || (!aiPrompt.trim() && !draft.title)}
          >
            {aiLoading ? (
              <>
                <svg className="mr-2 size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              "Run"
            )}
          </Button>
        </div>
      )}

    </div>
  );
}

export function ContentDetailOverlay({
  item,
  onClose,
}: {
  item: ContentItem | null;
  onClose: () => void;
}) {
  const { clients } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContentItem | null>(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    setDraft(item);
    setEditing(false);
    setPendingFile(null);
  }, [item]);

  if (!item || !draft) return null;

  const handleApprove = async () => {
    const client = clients.find((c) => c.name === item.client);

    // ── Upload pending file to Supabase if needed ──
    let mediaUrls = draft?.media || [];
    if (pendingFile) {
      try {
        const { uploadContentMedia } = await import("@/lib/db");
        const url = await uploadContentMedia(pendingFile, draft?.clientId || "unknown");
        if (url) {
          mediaUrls = [url];
          setDraft(draft ? { ...draft, media: [url] } : draft);
          setPendingFile(null);
        } else {
          toast.error("Failed to upload media. Please try again.");
          return;
        }
      } catch {
        toast.error("Failed to upload media. Please try again.");
        return;
      }
    }

    // ── Upload blob URLs to Supabase (data URLs are handled natively by API routes) ──
    if (mediaUrls.length > 0 && mediaUrls[0] && mediaUrls[0].startsWith("blob:")) {
      try {
        const { uploadContentMedia } = await import("@/lib/db");
        const resp = await fetch(mediaUrls[0]);
        const blob = await resp.blob();
        const file = new File([blob], "upload.png", { type: blob.type || "image/png" });
        const uploadedUrl = await uploadContentMedia(file, draft?.clientId || "unknown");
        if (uploadedUrl) {
          mediaUrls = [uploadedUrl];
          setDraft(draft ? { ...draft, media: [uploadedUrl] } : draft);
        } else {
          toast.error("Failed to upload image. Please try again.");
          return;
        }
      } catch {
        toast.error("Failed to upload image. Please try again.");
        return;
      }
    }

    // ── Facebook Publish/Schedule ──
    const fbConnection = client?.socialIntegrations?.Facebook;
    const fbPages: FacebookPage[] = fbConnection?.pages || [];
    const isFacebook = item.platform === "Facebook";
    const canPublishFb = isFacebook && fbConnection?.connected && fbConnection?.accessToken && fbPages.length > 0;

    // ── Instagram Publish ──
    const igConnection = client?.socialIntegrations?.Instagram;
    const isInstagram = item.platform === "Instagram";
    const canPublishIg = isInstagram && igConnection?.connected && igConnection?.accessToken;

    const message = (item.body || item.caption || "").trim();
    const hasImage = mediaUrls.length > 0 && !!mediaUrls[0] && !mediaUrls[0].startsWith("blob:");

    if (isInstagram && !hasImage) {
      toast.error("Instagram requires an image to publish. Please upload or generate an image first.");
      return;
    }

    // ── Validate token before publish ──
    if (canPublishFb) {
      const page = fbPages[0]!;
      setScheduling(true);
      try {
        const tokenCheck = await fetch("/api/facebook/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageAccessToken: page.access_token }),
        });
        const tokenData = await tokenCheck.json();

        if (!tokenData.valid) {
          toast.error(
            tokenData.is_expired
              ? `Facebook token expired. Please reconnect Facebook for "${item.client}" in Client Settings.`
              : `Facebook token invalid: ${tokenData.error || "Unknown error"}. Please reconnect Facebook.`
          );
          setScheduling(false);
          return;
        }

        // Auto-refresh token if expiring within 7 days
        if (tokenData.valid && tokenData.expires_at && tokenData.expires_at > 0) {
          const daysUntilExpiry = (tokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry < 7) {
            try {
              const refreshResp = await fetch("/api/facebook/refresh-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: page.access_token }),
              });
              const refreshData = await refreshResp.json();
              if (refreshData.success && refreshData.accessToken) {
                page.access_token = refreshData.accessToken;
                // Update token in store
                const client = clients.find((c) => c.name === item.client);
                if (client?.socialIntegrations?.Facebook) {
                  actions.updateClient(client.id, {
                    socialIntegrations: {
                      ...client.socialIntegrations,
                      Facebook: {
                        ...client.socialIntegrations.Facebook,
                        accessToken: refreshData.accessToken,
                      },
                    },
                  });
                }
              }
            } catch {
              // Continue with old token if refresh fails
            }
          }
        }

        // Token is valid - proceed with publish/schedule
        if (item.scheduledDate && item.scheduledTime) {
          // Schedule post
          const scheduledDateTime = new Date(`${item.scheduledDate}T${item.scheduledTime}:00`);
          if (scheduledDateTime <= new Date()) {
            toast.error("Schedule time must be in the future.");
            setScheduling(false);
            return;
          }

          const unixTimestamp = Math.floor(scheduledDateTime.getTime() / 1000);
          const response = await fetch("/api/facebook/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId: page.id,
              pageAccessToken: page.access_token,
              message,
              scheduledPublishTime: unixTimestamp,
            }),
          });
          const data = await response.json();
          if (data.success) {
            actions.update(item.id, {
              status: "Approved",
              notes: `Scheduled for ${scheduledDateTime.toLocaleString()} on ${page.name} (Post ID: ${data.postId})`,
            });
            toast.success(`Scheduled on ${page.name}!`);
            onClose();
          } else {
            toast.error(`Failed to schedule: ${data.error}`);
          }
        } else {
          // Publish now
          let response;
          if (hasImage) {
            response = await fetch("/api/facebook/photo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: page.id,
                pageAccessToken: page.access_token,
                message,
                imageUrl: mediaUrls[0],
              }),
            });
          } else {
            response = await fetch("/api/facebook/post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: page.id,
                pageAccessToken: page.access_token,
                message,
              }),
            });
          }
          const data = await response.json();
          if (data.success) {
            actions.update(item.id, {
              status: "Approved",
              notes: `Published to ${page.name} (Post ID: ${data.postId})`,
            });
            toast.success(`Published to ${page.name}!`);
            onClose();
          } else {
            toast.error(`Failed to publish: ${data.error}`);
          }
        }
      } catch {
        toast.error("Failed to publish. Please try again.");
      } finally {
        setScheduling(false);
      }
    } else if (canPublishIg) {
      // ── Instagram Publish ──
      setScheduling(true);
      try {
        const tokenCheck = await fetch("/api/facebook/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageAccessToken: igConnection.accessToken }),
        });
        const tokenData = await tokenCheck.json();

        if (!tokenData.valid) {
          toast.error(
            tokenData.is_expired
              ? `Instagram token expired. Please reconnect Instagram for "${item.client}" in Client Settings.`
              : `Instagram token invalid: ${tokenData.error || "Unknown error"}. Please reconnect Instagram.`
          );
          setScheduling(false);
          return;
        }

        const igUserId = igConnection.accountId || "";
        const response = await fetch("/api/instagram/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            igUserId,
            accessToken: igConnection.accessToken,
            imageUrl: hasImage ? mediaUrls[0] : "",
            caption: message,
          }),
        });
        const data = await response.json();
        if (data.success) {
          actions.update(item.id, {
            status: "Approved",
            notes: `Published to Instagram (Post ID: ${data.postId})`,
          });
          toast.success("Published to Instagram!");
          onClose();
        } else {
          toast.error(`Failed to publish to Instagram: ${data.error}`);
        }
      } catch {
        toast.error("Failed to publish to Instagram. Please try again.");
      } finally {
        setScheduling(false);
      }
    } else {
      // No platform connection - just approve
      actions.update(item.id, { status: "Approved" });
      toast.success("Content approved");
      onClose();
    }
  };

  const handlePublishNow = async () => {
    const client = clients.find((c) => c.name === item.client);

    // ── Upload pending file to Supabase if needed ──
    let mediaUrls = draft?.media || [];
    if (pendingFile) {
      try {
        const { uploadContentMedia } = await import("@/lib/db");
        const url = await uploadContentMedia(pendingFile, draft?.clientId || "unknown");
        if (url) {
          mediaUrls = [url];
          setDraft(draft ? { ...draft, media: [url] } : draft);
          setPendingFile(null);
        } else {
          toast.error("Failed to upload media. Please try again.");
          return;
        }
      } catch {
        toast.error("Failed to upload media. Please try again.");
        return;
      }
    }

    // ── Upload blob URLs to Supabase (data URLs are handled natively by API routes) ──
    if (mediaUrls.length > 0 && mediaUrls[0] && mediaUrls[0].startsWith("blob:")) {
      try {
        const { uploadContentMedia } = await import("@/lib/db");
        const resp = await fetch(mediaUrls[0]);
        const blob = await resp.blob();
        const file = new File([blob], "upload.png", { type: blob.type || "image/png" });
        const uploadedUrl = await uploadContentMedia(file, draft?.clientId || "unknown");
        if (uploadedUrl) {
          mediaUrls = [uploadedUrl];
          setDraft(draft ? { ...draft, media: [uploadedUrl] } : draft);
        } else {
          toast.error("Failed to upload image. Please try again.");
          return;
        }
      } catch {
        toast.error("Failed to upload image. Please try again.");
        return;
      }
    }

    const isFacebook = item.platform === "Facebook";
    const isInstagram = item.platform === "Instagram";
    const fbConnection = client?.socialIntegrations?.Facebook;
    const fbPages: FacebookPage[] = fbConnection?.pages || [];
    const canPublishFb = isFacebook && fbConnection?.connected && fbConnection?.accessToken && fbPages.length > 0;
    const igConnection = client?.socialIntegrations?.Instagram;
    const canPublishIg = isInstagram && igConnection?.connected && igConnection?.accessToken;

    const message = (item.body || item.caption || "").trim();
    const hasImage = mediaUrls.length > 0 && !!mediaUrls[0] && !mediaUrls[0].startsWith("blob:");

    if (isInstagram && !hasImage) {
      toast.error("Instagram requires an image to publish. Please upload or generate an image first.");
      return;
    }

    setPublishingNow(true);
    try {
      if (canPublishFb) {
        const page = fbPages[0]!;
        const tokenCheck = await fetch("/api/facebook/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageAccessToken: page.access_token }),
        });
        const tokenData = await tokenCheck.json();
        if (!tokenData.valid) {
          toast.error(
            tokenData.is_expired
              ? `Facebook token expired. Please reconnect Facebook for "${item.client}" in Client Settings.`
              : `Facebook token invalid: ${tokenData.error || "Unknown error"}. Please reconnect Facebook.`
          );
          return;
        }

        // Auto-refresh token if expiring within 7 days
        if (tokenData.valid && tokenData.expires_at && tokenData.expires_at > 0) {
          const daysUntilExpiry = (tokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry < 7) {
            try {
              const refreshResp = await fetch("/api/facebook/refresh-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: page.access_token }),
              });
              const refreshData = await refreshResp.json();
              if (refreshData.success && refreshData.accessToken) {
                page.access_token = refreshData.accessToken;
                const client = clients.find((c) => c.name === item.client);
                if (client?.socialIntegrations?.Facebook) {
                  actions.updateClient(client.id, {
                    socialIntegrations: {
                      ...client.socialIntegrations,
                      Facebook: {
                        ...client.socialIntegrations.Facebook,
                        accessToken: refreshData.accessToken,
                      },
                    },
                  });
                }
              }
            } catch {
              // Continue with old token if refresh fails
            }
          }
        }

        let response;
        if (hasImage) {
          response = await fetch("/api/facebook/photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId: page.id,
              pageAccessToken: page.access_token,
              message,
              imageUrl: mediaUrls[0],
            }),
          });
        } else {
          response = await fetch("/api/facebook/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId: page.id,
              pageAccessToken: page.access_token,
              message,
            }),
          });
        }
        const data = await response.json();
        if (data.success) {
          actions.update(item.id, {
            status: "Submitted",
            notes: `Published to ${page.name} (Post ID: ${data.postId})`,
          });
          toast.success(`Published to ${page.name}!`);
          onClose();
        } else {
          toast.error(`Failed to publish: ${data.error}`);
        }
      } else if (canPublishIg) {
        const igUserId = igConnection.accountId || "";
        const tokenCheck = await fetch("/api/facebook/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageAccessToken: igConnection.accessToken }),
        });
        const tokenData = await tokenCheck.json();
        if (!tokenData.valid) {
          toast.error(
            tokenData.is_expired
              ? `Instagram token expired. Please reconnect Instagram for "${item.client}" in Client Settings.`
              : `Instagram token invalid: ${tokenData.error || "Unknown error"}. Please reconnect Instagram.`
          );
          return;
        }

        const response = await fetch("/api/instagram/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            igUserId,
            accessToken: igConnection.accessToken,
            imageUrl: hasImage ? mediaUrls[0] : "",
            caption: message,
          }),
        });
        const data = await response.json();
        if (data.success) {
          actions.update(item.id, {
            status: "Submitted",
            notes: `Published to Instagram (Post ID: ${data.postId})`,
          });
          toast.success("Published to Instagram!");
          onClose();
        } else {
          toast.error(`Failed to publish to Instagram: ${data.error}`);
        }
      } else {
        actions.update(item.id, { status: "Submitted" });
        toast.success("Content submitted");
        onClose();
      }
    } catch {
      toast.error("Failed to publish. Please try again.");
    } finally {
      setPublishingNow(false);
    }
  };

  const save = () => {
    actions.update(item.id, {
      title: draft.title,
      caption: draft.caption,
      ...(draft.body !== undefined ? { body: draft.body } : {}),
      type: draft.type,
      hashtags: draft.hashtags,
      cta: draft.cta,
      ...(draft.media ? { media: draft.media } : {}),
      ...(draft.notes !== undefined ? { notes: draft.notes } : {}),
    });
    setEditing(false);
    toast.success("Content updated");
  };

  const platformKey = item.platform.toLowerCase().replace(" / ", "").replace(" ", "").replace("(twitter)", "") as "facebook" | "instagram" | "gbp";

  return (
    <>
      <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto p-0 sm:w-full">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">Content Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 py-5">
            <div>
              {editing ? (
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              ) : (
                <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <PlatformBadge platform={item.platform} />
                <ContentTypeBadge type={draft.type} />
                <StatusBadge status={item.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
              <Field label="Client">{item.client}</Field>
              <Field label="Platform">{item.platform}</Field>
              <Field label="Content Type">{draft.type}</Field>
              <Field label="Scheduled">{item.scheduledDate ? `${item.scheduledDate} ${item.scheduledTime || ""}` : formatDate(item.date)}</Field>
            </div>

            {/* Preview Link - show when post has been published */}
            {!editing && (() => {
              const postIdMatch = item.notes?.match(/Post ID:\s*(\d+_\d+)/);
              const postId = postIdMatch?.[1];
              if (!postId) return null;

              const postUrl = item.platform === "Instagram"
                ? `https://www.facebook.com/${postId}`
                : `https://www.facebook.com/${postId}`;

              return (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  View published post
                </a>
              );
            })()}

            {/* Platform-specific Preview */}
            <div>
              <p className="mb-2 text-sm font-medium">Post Preview</p>
              <div className="rounded-xl border bg-card p-4 shadow-soft">
                <SocialMediaPreviewCard
                  profileName={(() => {
                    const client = clients.find((c) => c.name === item.client);
                    if (item.platform === "Instagram") {
                      const ig = client?.socialIntegrations?.Instagram;
                      return ig?.accountName || ig?.selectedPageName || item.client;
                    }
                    if (item.platform === "Facebook") {
                      const fb = client?.socialIntegrations?.Facebook;
                      return fb?.selectedPageName || item.client;
                    }
                    return item.client;
                  })()}
                  profileImage={(() => {
                    const client = clients.find((c) => c.name === item.client);
                    if (item.platform === "Instagram") {
                      return client?.socialIntegrations?.Instagram?.profilePicture || undefined;
                    }
                    if (item.platform === "Facebook") {
                      const fb = client?.socialIntegrations?.Facebook;
                      return `https://graph.facebook.com/${fb?.selectedPageId || ""}/picture?height=80&width=80`;
                    }
                    return undefined;
                  })()}
                  timestamp={formatDate(item.date)}
                  content={editing ? draft.caption : `${item.caption || ""}${item.hashtags?.length > 0 ? `\n\n${item.hashtags.map((h) => `#${h}`).join(" ")}` : ""}`}
                  images={(draft.media || []).map((m) => typeof m === "string" ? { src: m, alt: "Uploaded media" } : m)}
                  platform={platformKey === "gbp" ? "gbp" : platformKey === "instagram" ? "instagram" : "facebook"}
                  gbpTitle={item.client}
                  gbpButtonLabel="Learn More"
                  gbpIsVerified={true}
                />
              </div>
              {editing && (
                <div className="mt-3">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Edit Body</Label>
                  <Textarea
                    className="mt-1.5"
                    rows={5}
                    value={draft.caption}
                    onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                    placeholder="Write your post content including hashtags..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={async () => {
                      if (!draft.title) {
                        toast.error("Enter a topic first.");
                        return;
                      }
                      try {
                        const resp = await fetch("/api/ai/generate-caption", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            topic: draft.title,
                            body: draft.caption || "",
                            platform: draft.platform || "Facebook",
                            tone: "professional",
                            client_name: draft.client || "",
                          }),
                        });
                        if (!resp.ok) throw new Error("Generation failed");
                        const data = await resp.json();
                        if (data.caption) setDraft({ ...draft, caption: data.caption });
                        if (data.hashtags && data.hashtags.length > 0) {
                          const cleanTags = data.hashtags.map((t: string) => t.replace(/^#/, ""));
                          setDraft({ ...draft, hashtags: cleanTags });
                        }
                        toast.success("AI caption regenerated!");
                      } catch {
                        toast.error("Failed to regenerate caption.");
                      }
                    }}
                  >
                    <svg className="mr-1.5 size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                    AI Regenerate Caption
                  </Button>
                </div>
              )}
            </div>

            {/* Replace Media - only in edit mode */}
            {editing && (
              <ReplaceMediaSection draft={draft} setDraft={setDraft} setPendingFile={setPendingFile} />
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">CTA</Label>
                {editing ? (
                  <Input
                    className="mt-1.5"
                    value={draft.cta}
                    onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm">{item.cta || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Hashtags</Label>
                {editing ? (
                  <Input
                    className="mt-1.5"
                    value={(draft.hashtags || []).join(", ")}
                    onChange={(e) => setDraft({
                      ...draft,
                      hashtags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })}
                    placeholder="tag1, tag2, tag3"
                  />
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(item.hashtags || []).length > 0 ? (
                      item.hashtags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Additional Notes
                </Label>
                {editing ? (
                  <Textarea
                    className="mt-1.5"
                    rows={2}
                    value={draft.notes ?? ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{item.notes || "—"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card px-6 py-4">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => { setDraft(item); setEditing(false); }}>
                  Cancel
                </Button>
                <Button onClick={save}>Save Changes</Button>
              </>
            ) : (
              <>
                {item.status === "Deleted" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        actions.restore(item.id);
                        toast.success("Content restored");
                        onClose();
                      }}
                    >
                      Restore
                    </Button>
                    <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                      Delete Permanently
                    </Button>
                  </>
                )}
                {item.status === "Approved" && (
                  <>
                    <Button
                      onClick={handlePublishNow}
                      disabled={publishingNow}
                    >
                      {publishingNow ? "Publishing..." : "Publish Now"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(true);
                        toast.info("Edit scheduled date, then save to reschedule");
                      }}
                    >
                      Reschedule
                    </Button>
                  </>
                )}
                {item.status !== "Approved" && item.status !== "Deleted" && item.status !== "Submitted" && (
                  <>
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                    <Button
                      onClick={handlePublishNow}
                      disabled={publishingNow || scheduling}
                    >
                      {publishingNow ? "Publishing..." : "Publish Now"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleApprove}
                      disabled={scheduling || publishingNow}
                    >
                      {scheduling ? "Processing..." : "Approve"}
                    </Button>
                    <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                      Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {item.status === "Deleted" ? "Delete permanently?" : "Move to Deleted?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {item.status === "Deleted"
                ? "This content will be permanently removed. This action cannot be undone."
                : "This content will be moved to Deleted. You can restore it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (item.status === "Deleted") {
                  actions.purge(item.id);
                  toast.success("Content permanently deleted");
                } else {
                  actions.setStatus(item.id, "Deleted");
                  toast.success("Content moved to Deleted");
                }
                setConfirmDelete(false);
                onClose();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
