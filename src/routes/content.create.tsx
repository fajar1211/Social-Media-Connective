import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Clock, Save, CalendarClock } from "lucide-react";
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
  PLATFORMS,
  useStore,
  type ContentType,
  type Platform,
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
const tones = ["Professional", "Friendly", "Educational", "Promotional", "Casual"];
const languages = ["English", "Indonesian"];

type Generated = {
  title: string;
  caption: string;
  body: string;
  hashtags: string;
  cta: string;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function CreateContent() {
  const { clients } = useStore();
  const navigate = useNavigate();
  const [client, setClient] = useState("");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("Education");
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [type, setType] = useState<ContentType>("Carousel");
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  const selectedClient = clients.find((c) => c.name === client);
  const fbConnection = selectedClient?.socialIntegrations?.Facebook;
  const pages: FacebookPage[] = fbConnection?.pages || [];
  const isFacebook = platform === "Facebook";
  const canPublish = isFacebook && fbConnection?.connected && fbConnection?.accessToken;

  const generate = () => {
    if (!client || !topic.trim()) {
      toast.error("Select a client and enter a topic first.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setGenerated({
        title: topic.trim(),
        caption: `${topic.trim()} — a ${tone.toLowerCase()} ${goal.toLowerCase()} post for ${client}, written in ${language} for ${platform}.`,
        body:
          `Here is what matters about ${topic.trim()}:\n\n` +
          "1. Start with the outcome your audience cares about.\n" +
          "2. Explain the process in plain language.\n" +
          "3. Close with a clear next step." +
          (instructions ? `\n\nNotes applied: ${instructions}` : ""),
        hashtags: `#${topic.trim().split(/\s+/).slice(0, 2).join("")} #${goal} #${client.replace(/\s+/g, "")}`,
        cta: "Book a consultation today.",
      });
      setLoading(false);
      toast.success("Content generated");
    }, 900);
  };

  const save = (status: "Suggested" | "Submitted") => {
    if (!generated) return;
    actions.addContent({
      title: generated.title,
      client,
      platform,
      type,
      status,
      date: new Date().toISOString().slice(0, 10),
      caption: generated.caption,
      body: generated.body,
      hashtags: generated.hashtags.split(/\s+/).filter(Boolean),
      cta: generated.cta,
      notes: instructions,
      media: [],
    });
    toast.success(status === "Submitted" ? "Content submitted for review" : "Draft saved");
    navigate({ to: status === "Submitted" ? "/submitted" : "/suggested" });
  };

  const publishNow = async () => {
    if (!generated || !canPublish || !selectedPage) {
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
      const message = `${generated.caption}\n\n${generated.body}\n\n${generated.hashtags}`;

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
          title: generated.title,
          client,
          platform,
          type,
          status: "Approved",
          date: new Date().toISOString().slice(0, 10),
          caption: generated.caption,
          body: generated.body,
          hashtags: generated.hashtags.split(/\s+/).filter(Boolean),
          cta: generated.cta,
          notes: `Published to Facebook: ${page.name} (Post ID: ${data.postId})`,
          media: [],
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
    if (!generated || !canPublish || !selectedPage || !scheduleDateTime) {
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
      const message = `${generated.caption}\n\n${generated.body}\n\n${generated.hashtags}`;

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
          title: generated.title,
          client,
          platform,
          type,
          status: "Submitted",
          date: scheduledDate.toISOString().slice(0, 10),
          caption: generated.caption,
          body: generated.body,
          hashtags: generated.hashtags.split(/\s+/).filter(Boolean),
          cta: generated.cta,
          notes: `Scheduled for ${scheduledDate.toLocaleString()} on ${page.name} (Post ID: ${data.postId})`,
          media: [],
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
      <PageHeader
        title="Create Content"
        subtitle="Create marketing content for your selected platform."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border bg-card p-6 shadow-soft">
          <Row label="Client">
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
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
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
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
            <Row label="Tone">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Language">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </div>
          <Row label="Additional Instructions">
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Optional"
            />
          </Row>
          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate Content"}
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold">Generated Content</h2>
          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : generated ? (
            <div className="mt-5 space-y-4">
              <Row label="Title">
                <Input
                  value={generated.title}
                  onChange={(e) => setGenerated({ ...generated, title: e.target.value })}
                />
              </Row>
              <Row label="Caption">
                <Textarea
                  rows={3}
                  value={generated.caption}
                  onChange={(e) => setGenerated({ ...generated, caption: e.target.value })}
                />
              </Row>
              <Row label="Body">
                <Textarea
                  rows={6}
                  value={generated.body}
                  onChange={(e) => setGenerated({ ...generated, body: e.target.value })}
                />
              </Row>
              <Row label="Hashtags">
                <Input
                  value={generated.hashtags}
                  onChange={(e) => setGenerated({ ...generated, hashtags: e.target.value })}
                />
              </Row>
              <Row label="CTA">
                <Input
                  value={generated.cta}
                  onChange={(e) => setGenerated({ ...generated, cta: e.target.value })}
                />
              </Row>
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Media placeholder — attach media after saving.
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

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={generate}>
                  Regenerate
                </Button>
                <Button variant="outline" onClick={() => save("Suggested")}>
                  <Save className="mr-1.5 size-3.5" />
                  Save Draft
                </Button>
                <Button onClick={() => save("Submitted")}>
                  <Clock className="mr-1.5 size-3.5" />
                  Submit
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Fill in the form and click Generate Content. Your editable draft will appear here.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
