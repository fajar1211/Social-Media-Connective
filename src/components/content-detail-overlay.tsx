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
import { Trash2, Image, Film, Upload } from "lucide-react";
import { actions, formatDate, type ContentItem } from "@/lib/content-store";
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
}: {
  draft: ContentItem;
  setDraft: (d: ContentItem) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(
    draft.type === "Short Video" ? "video" : draft.type === "Image" || draft.type === "Carousel" ? "image" : null
  );
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [gbpImageUrl, setGbpImageUrl] = useState("");

  const handleUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const isVideo = file.type.startsWith("video/");
      setMediaType(isVideo ? "video" : "image");
      setDraft({ ...draft, media: [url] });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <Label className="text-xs font-medium">Replace Image/Video</Label>

      {/* Media Type Tabs */}
      <div className="flex gap-1 rounded-md border bg-background p-0.5">
        <button
          type="button"
          onClick={() => { setMediaType("image"); if (draft.type === "Short Video") setDraft({ ...draft, type: "Image" }); }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mediaType === "image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image className="size-3.5" />
          Image
        </button>
        <button
          type="button"
          onClick={() => { setMediaType("video"); if (draft.type !== "Short Video") setDraft({ ...draft, type: "Short Video" }); }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mediaType === "video" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Film className="size-3.5" />
          Video
        </button>
      </div>

      {/* Image Type Options */}
      {mediaType === "image" && (
        <div className="flex gap-1 rounded-md border bg-background p-0.5">
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
      {mediaType === "video" && (
        <div className="flex gap-1 rounded-md border bg-background p-0.5">
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

      {/* Upload or AI Generate */}
      <div className="space-y-2">
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button variant="outline" size="sm" className="w-full" onClick={() => imageInputRef.current?.click()}>
          <Upload className="mr-1.5 size-3.5" />
          Upload {mediaType === "video" ? "Video" : "Image"}
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAiGen((p) => !p)}>
          <svg className="mr-1.5 size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          AI Generate {mediaType === "video" ? "Video" : "Image"}
        </Button>
      </div>

      {/* AI Generation Panel */}
      {showAiGen && (
        <div className="space-y-2 rounded-lg border bg-background p-3">
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
                <img src={referenceImage} alt="Reference" className="h-8 w-8 rounded object-cover shrink-0" />
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
            placeholder="Image/Video prompt (used to generate)..."
            className="text-xs"
          />
          <Button size="sm" className="w-full" onClick={() => toast.success("AI generation started...")}>
            Run
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContentItem | null>(item);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(item);
    setEditing(false);
  }, [item]);

  if (!item || !draft) return null;

  const save = () => {
    actions.update(item.id, {
      title: draft.title,
      caption: draft.caption,
      ...(draft.body !== undefined ? { body: draft.body } : {}),
      type: draft.type,
      hashtags: draft.hashtags,
      cta: draft.cta,
      media: draft.media,
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
              <Field label="Created">{formatDate(item.date)}</Field>
            </div>

            {/* Platform-specific Preview */}
            <div>
              <p className="mb-2 text-sm font-medium">Post Preview</p>
              <div className="rounded-xl border bg-card p-4 shadow-soft">
                <SocialMediaPreviewCard
                  profileName={item.client}
                  timestamp={formatDate(item.date)}
                  content={editing ? draft.caption : item.caption}
                  images={draft.media || []}
                  platform={platformKey === "gbp" ? "gbp" : platformKey === "instagram" ? "instagram" : "facebook"}
                  gbpTitle={item.client}
                  gbpButtonLabel="Learn More"
                  gbpIsVerified={true}
                />
              </div>
            </div>

            {/* Replace Media - only in edit mode */}
            {editing && (
              <ReplaceMediaSection draft={draft} setDraft={setDraft} />
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Caption</Label>
                {editing ? (
                  <Textarea
                    className="mt-1.5"
                    rows={3}
                    value={draft.caption}
                    onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                )}
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Hashtags</Label>
                {editing ? (
                  <Input
                    className="mt-1.5"
                    value={draft.hashtags.join(" ")}
                    onChange={(e) => setDraft({ ...draft, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.hashtags.length ? item.hashtags.join(" ") : "—"}
                  </p>
                )}
              </div>
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
                {item.status !== "Deleted" && (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
                {item.status === "Deleted" ? (
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
                ) : (
                  <>
                    {(item.status === "Suggested" || item.status === "Additional") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          actions.setStatus(item.id, "Submitted");
                          toast.success("Content submitted for review");
                          onClose();
                        }}
                      >
                        Submit
                      </Button>
                    )}
                    {item.status !== "Approved" && (
                      <Button
                        onClick={() => {
                          actions.setStatus(item.id, "Approved");
                          toast.success("Content approved");
                          onClose();
                        }}
                      >
                        Approve
                      </Button>
                    )}
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
