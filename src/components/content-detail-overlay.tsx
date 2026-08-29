import { useEffect, useState } from "react";
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
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { actions, formatDate, type ContentItem } from "@/lib/content-store";
import { ContentTypeBadge, PlatformBadge, StatusBadge } from "@/components/badges";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Preview({ item }: { item: ContentItem }) {
  const [slide, setSlide] = useState(0);
  const media = item.media ?? [];

  if (item.type === "Carousel" && media.length) {
    return (
      <div className="relative overflow-hidden rounded-lg border bg-muted">
        <img src={media[slide]} alt={`Slide ${slide + 1}`} className="aspect-[4/3] w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/45 to-transparent p-3">
          <Button
            size="icon"
            variant="secondary"
            className="size-8"
            onClick={() => setSlide((s) => (s - 1 + media.length) % media.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium">
            {slide + 1} / {media.length}
          </span>
          <Button
            size="icon"
            variant="secondary"
            className="size-8"
            onClick={() => setSlide((s) => (s + 1) % media.length)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (item.type === "Image") {
    return media[0] ? (
      <img src={media[0]} alt={item.title} className="aspect-[4/3] w-full rounded-lg border object-cover" />
    ) : (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        No image attached
      </div>
    );
  }

  if (item.type === "Short Video") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <PlayCircle className="size-8" strokeWidth={1.5} />
          <span className="text-xs">Video preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
      {item.body || item.caption}
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
      hashtags: draft.hashtags,
      cta: draft.cta,
      ...(draft.notes !== undefined ? { notes: draft.notes } : {}),
    });
    setEditing(false);
    toast.success("Content updated");
  };

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
                <ContentTypeBadge type={item.type} />
                <StatusBadge status={item.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
              <Field label="Client">{item.client}</Field>
              <Field label="Platform">{item.platform}</Field>
              <Field label="Content Type">{item.type}</Field>
              <Field label="Created">{formatDate(item.date)}</Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Content Preview</p>
              <Preview item={item} />
            </div>

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
                  <p className="mt-1 text-sm leading-relaxed">{item.caption}</p>
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
