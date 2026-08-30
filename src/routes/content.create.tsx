import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Clock,
  Save,
  CalendarClock,
  Image,
  Trash2,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actions,
  CONTENT_TYPES,
  SOCIAL_PLATFORMS,
  useStore,
  type ContentType,
  type SocialPlatform,
  type FacebookPage,
} from "@/lib/content-store";

export const Route = createFileRoute("/content/create")({
  head: () => ({
    meta: [
      { title: "Create Content — Social Media Connective Admin" },
      { name: "description", content: "Create marketing content for your selected platform." },
      { property: "og:title", content: "Create Content — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Create marketing content for your selected platform.",
      },
    ],
  }),
  component: CreateContent,
});

const goals = ["Education", "Promotion", "Engagement", "Awareness", "Announcement", "Other"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function CreateContent() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlClientId = searchParams.get("clientId") || "";
  const urlClientName = searchParams.get("clientName") || "";
  const { clients } = useStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(urlClientId);
  const [selectedClientName, setSelectedClientName] = useState(urlClientName);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("Education");
  const [platform, setPlatform] = useState<SocialPlatform>("Facebook");
  const [type, setType] = useState<ContentType>("Carousel");
  const [body, setBody] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const client = clients.find((c) => c.id === selectedClientId);
  const fbConnection = client?.socialIntegrations?.Facebook;
  const pages: FacebookPage[] = fbConnection?.pages || [];
  const isFacebook = platform === "Facebook";
  const canPublish = isFacebook && fbConnection?.connected && fbConnection?.accessToken;

  const connectedPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => client?.socialIntegrations?.[p]?.connected === true
  );

  const handleImageUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
      setMediaType("image");
      setType("Image");
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
      setMediaType("video");
      setType("Short Video");
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
  };

  const generate = () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Content generated");
    }, 900);
  };

  const save = (status: "Suggested" | "Submitted") => {
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    if (!client) {
      toast.error("Client not found.");
      return;
    }
    actions.addContent({
      title: topic.trim(),
      client: client.name,
      platform: platform as any,
      type,
      status,
      date: new Date().toISOString().slice(0, 10),
      caption: topic.trim(),
      body: body,
      hashtags: [],
      cta: "",
      notes: "",
      media: mediaPreview ? [mediaPreview] : [],
    });
    toast.success(status === "Submitted" ? "Content submitted for review" : "Draft saved");
    navigate({ to: status === "Submitted" ? "/submitted" : "/suggested" });
  };

  const publishNow = async () => {
    if (!canPublish || !selectedPage || !client) {
      toast.error("Please select a Facebook page first.");
      return;
    }

    const page = pages.find((p) => p.id === selectedPage);
    if (!page) {
      toast.error("Selected page not found.");
      return;
    }

    setPublishing(true);
    try {
      const message = `${topic}\n\n${body}`;

      const response = await fetch("/api/facebook/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          pageAccessToken: page.access_token,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        actions.addContent({
          title: topic.trim(),
          client: client.name,
          platform: platform as any,
          type,
          status: "Approved",
          date: new Date().toISOString().slice(0, 10),
          caption: topic.trim(),
          body: body,
          hashtags: [],
          cta: "",
          notes: `Published to Facebook: ${page.name} (Post ID: ${data.postId})`,
          media: mediaPreview ? [mediaPreview] : [],
        });
        toast.success(`Published to ${page.name}!`);
        navigate({ to: "/approved" });
      } else {
        toast.error(`Failed to publish: ${data.error}`);
      }
    } catch {
      toast.error("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const schedulePost = async () => {
    if (!canPublish || !selectedPage || !scheduleDateTime || !client) {
      toast.error("Please select a page and schedule time.");
      return;
    }

    const page = pages.find((p) => p.id === selectedPage);
    if (!page) {
      toast.error("Selected page not found.");
      return;
    }

    const scheduledDate = new Date(scheduleDateTime);
    if (scheduledDate <= new Date()) {
      toast.error("Schedule time must be in the future.");
      return;
    }

    setPublishing(true);
    try {
      const message = `${topic}\n\n${body}`;

      const response = await fetch("/api/facebook/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          pageAccessToken: page.access_token,
          message,
          scheduledPublishTime: scheduledDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        actions.addContent({
          title: topic.trim(),
          client: client.name,
          platform: platform as any,
          type,
          status: "Submitted",
          date: scheduledDate.toISOString().slice(0, 10),
          caption: topic.trim(),
          body: body,
          hashtags: [],
          cta: "",
          notes: `Scheduled for ${scheduledDate.toLocaleString()} on ${page.name} (Post ID: ${data.postId})`,
          media: mediaPreview ? [mediaPreview] : [],
        });
        toast.success(`Scheduled for ${scheduledDate.toLocaleString()}!`);
        navigate({ to: "/submitted" });
      } else {
        toast.error(`Failed to schedule: ${data.error}`);
      }
    } catch {
      toast.error("Failed to schedule. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        {selectedClientId ? (
          <Link
            to="/clients/$clientId"
            params={{ clientId: selectedClientId }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to {client?.name || "Clients"}
          </Link>
        ) : (
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Clients
          </Link>
        )}
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create Content</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Create marketing content for {client?.name || "your client"}.
        </p>
      </div>

      {!selectedClientId && (
        <div className="mb-6 rounded-xl border bg-card p-6 shadow-soft">
          <Row label="Select Client">
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                const selected = clients.find((c) => c.id === value);
                setSelectedClientId(value);
                setSelectedClientName(selected?.name || "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl border bg-card p-6 shadow-soft lg:col-span-2">
          <Row label="Topic">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your content topic"
            />
          </Row>

          <div className="grid gap-5 sm:grid-cols-2">
            <Row label="Goal">
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Platform">
              <Select value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectedPlatforms.length > 0 ? (
                    connectedPlatforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))
                  ) : (
                    SOCIAL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Content Type">
              <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </div>

          <Row label="Body (Include Hashtag)">
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your content body including hashtags..."
            />
          </Row>

          <div className="grid gap-5 sm:grid-cols-2">
            <Row label="Start Date">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Row>
            <Row label="End Date">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Row>
          </div>

          {isFacebook && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Send className="size-4" />
                Facebook Publishing
              </div>
              {canPublish ? (
                <>
                  <Row label="Select Page">
                    <Select value={selectedPage} onValueChange={setSelectedPage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a Facebook page" />
                      </SelectTrigger>
                      <SelectContent>
                        {pages.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={publishNow}
                      disabled={publishing || !selectedPage}
                      className="flex-1"
                    >
                      {publishing ? (
                        "Publishing…"
                      ) : (
                        <>
                          <Send className="mr-1.5 size-3.5" />
                          Publish Now
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={schedulePost}
                      disabled={publishing || !selectedPage || !scheduleDateTime}
                      className="flex-1"
                    >
                      <CalendarClock className="mr-1.5 size-3.5" />
                      Schedule
                    </Button>
                  </div>
                  <Row label="Schedule Time (optional)">
                    <Input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </Row>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Connect Facebook in client Settings to publish directly.
                </p>
              )}
            </div>
          )}

          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? "Processing…" : "Schedule Now"}
          </Button>
        </div>

        <div className="space-y-5 rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold">Media Preview</h2>
          <p className="text-xs text-muted-foreground">
            Upload an image or video to preview your content.
          </p>

          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            className="hidden"
            accept="video/*"
            onChange={(e) => handleVideoUpload(e.target.files)}
          />

          {mediaPreview ? (
            <div className="relative">
              {mediaType === "image" ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full rounded-lg border object-cover"
                />
              ) : (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full rounded-lg border"
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 size-8"
                onClick={removeMedia}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                className="w-full"
              >
                <Image className="mr-2 size-4" />
                Add Image
              </Button>
              <Button
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                className="w-full"
              >
                <Video className="mr-2 size-4" />
                Add Video
              </Button>
            </div>
          )}

          {topic && (
            <div className="mt-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Preview</h3>
              <p className="mt-2 text-sm font-medium">{topic}</p>
              {body && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{body}</p>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
