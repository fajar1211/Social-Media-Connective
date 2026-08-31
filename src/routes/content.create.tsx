import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  CalendarClock,
  Image,
  Trash2,
  Video,
  X,
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
import { SocialMediaPreviewCard } from "@/components/social-media-preview-card";

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

const timezones = [
  // UTC-12 to UTC-1
  { value: "Pacific/BakerIsland", label: "Baker Island (UTC-12)" },
  { value: "Pacific/Johnston", label: "Johnston Atoll (UTC-11)" },
  { value: "Pacific/Honolulu", label: "Honolulu, Hawaii (UTC-10)" },
  { value: "America/Anchorage", label: "Anchorage, Alaska (UTC-9)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "America/Denver", label: "Denver (UTC-7)" },
  { value: "America/Chicago", label: "Chicago (UTC-6)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Caracas", label: "Caracas (UTC-4)" },
  { value: "America/Halifax", label: "Halifax (UTC-4)" },
  { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "Atlantic/South_Georgia", label: "South Georgia (UTC-2)" },
  { value: "Atlantic/Azores", label: "Azores (UTC-1)" },
  // UTC+0
  { value: "Europe/London", label: "London (UTC+0)" },
  { value: "Europe/Lisbon", label: "Lisbon (UTC+0)" },
  { value: "Africa/Casablanca", label: "Casablanca (UTC+0)" },
  { value: "Africa/Abidjan", label: "Abidjan (UTC+0)" },
  // UTC+1
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1)" },
  { value: "Europe/Rome", label: "Rome (UTC+1)" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
  { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
  { value: "Africa/Algiers", label: "Algiers (UTC+1)" },
  // UTC+2
  { value: "Europe/Athens", label: "Athens (UTC+2)" },
  { value: "Europe/Istanbul", label: "Istanbul (UTC+2)" },
  { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)" },
  // UTC+3
  { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
  { value: "Asia/Baghdad", label: "Baghdad (UTC+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (UTC+3)" },
  { value: "Asia/Riyadh", label: "Riyadh (UTC+3)" },
  // UTC+4
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Baku", label: "Baku (UTC+4)" },
  { value: "Europe/Samara", label: "Samara (UTC+4)" },
  // UTC+5
  { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
  { value: "Asia/Tashkent", label: "Tashkent (UTC+5)" },
  // UTC+5:30
  { value: "Asia/Kolkata", label: "Mumbai, Kolkata (UTC+5:30)" },
  { value: "Asia/Colombo", label: "Colombo (UTC+5:30)" },
  // UTC+6
  { value: "Asia/Dhaka", label: "Dhaka (UTC+6)" },
  { value: "Asia/Almaty", label: "Almaty (UTC+6)" },
  // UTC+7
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh (UTC+7)" },
  { value: "Asia/Jakarta", label: "Jakarta (UTC+7)" },
  { value: "Asia/Phnom_Penh", label: "Phnom Penh (UTC+7)" },
  // UTC+8
  { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
  { value: "Asia/Taipei", label: "Taipei (UTC+8)" },
  { value: "Asia/Makassar", label: "Makassar (UTC+8)" },
  { value: "Asia/Manila", label: "Manila (UTC+8)" },
  { value: "Australia/Perth", label: "Perth (UTC+8)" },
  // UTC+9
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
  { value: "Asia/Pyongyang", label: "Pyongyang (UTC+9)" },
  { value: "Asia/Jayapura", label: "Jayapura (UTC+9)" },
  // UTC+9:30
  { value: "Australia/Adelaide", label: "Adelaide (UTC+9:30)" },
  // UTC+10
  { value: "Australia/Sydney", label: "Sydney (UTC+10)" },
  { value: "Australia/Melbourne", label: "Melbourne (UTC+10)" },
  { value: "Pacific/Guam", label: "Guam (UTC+10)" },
  { value: "Asia/Vladivostok", label: "Vladivostok (UTC+10)" },
  // UTC+11
  { value: "Pacific/Guadalcanal", label: "Guadalcanal (UTC+11)" },
  { value: "Asia/Srednekolymsk", label: "Srednekolymsk (UTC+11)" },
  // UTC+12
  { value: "Pacific/Auckland", label: "Auckland (UTC+12)" },
  { value: "Asia/Kamchatka", label: "Kamchatka (UTC+12)" },
  // UTC+13
  { value: "Pacific/Tongatapu", label: "Tongatapu (UTC+13)" },
  // UTC+14
  { value: "Pacific/Kiritimati", label: "Kiritimati (UTC+14)" },
];

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
  const urlClientId = (searchParams.get("clientId") || "").replace(/"/g, "");
  const urlClientName = (searchParams.get("clientName") || "").replace(/"/g, "");
  const { clients } = useStore();
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedClientId, setSelectedClientId] = useState(urlClientId);
  const [selectedClientName, setSelectedClientName] = useState(urlClientName);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform | "">("");
  const [type, setType] = useState<ContentType | "">("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showAiGen, setShowAiGen] = useState(false);
  const [gbpImageUrl, setGbpImageUrl] = useState("");
  const [publishMode, setPublishMode] = useState<"now" | "later" | null>(null);
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // GBP fields
  const [gbpExpanded, setGbpExpanded] = useState(true);
  const [gbpType, setGbpType] = useState<"Call to Action" | "Event" | "Offer" | "">("");
  const [gbpButtonLabel, setGbpButtonLabel] = useState("");
  const [gbpStartDate, setGbpStartDate] = useState("");
  const [gbpEndDate, setGbpEndDate] = useState("");
  const [gbpTitle, setGbpTitle] = useState("");
  const [gbpCouponCode, setGbpCouponCode] = useState("");
  const [gbpRedeemLink, setGbpRedeemLink] = useState("");
  const [gbpTerms, setGbpTerms] = useState("");
  const [gbpUrl, setGbpUrl] = useState("");

  const client = clients.find((c) => c.id === selectedClientId);
  const fbConnection = client?.socialIntegrations?.Facebook;
  const pages: FacebookPage[] = fbConnection?.pages || [];
  const isFacebook = platform === "Facebook";
  const isGBP = platform === "GBP";
  const isBlog = platform === "Blog";
  const canPublish = isFacebook && fbConnection?.connected && fbConnection?.accessToken;

  const availableContentTypes = isBlog
    ? ["Blog Article" as const]
    : CONTENT_TYPES.filter((t) => t !== "Blog Article");

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
      platform: (platform || "Facebook") as any,
      type: (type || "Carousel") as ContentType,
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
          platform: (platform || "Facebook") as any,
          type: (type || "Carousel") as ContentType,
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

  const scheduleFacebookPost = async () => {
    if (!canPublish || !selectedPage || !client || !scheduleDate || !scheduleTime) {
      toast.error("Please select a page and schedule time.");
      return;
    }

    const page = pages.find((p) => p.id === selectedPage);
    if (!page) {
      toast.error("Selected page not found.");
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledDateTime <= new Date()) {
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
          scheduledPublishTime: scheduledDateTime.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        actions.addContent({
          title: topic.trim(),
          client: client.name,
          platform: (platform || "Facebook") as any,
          type: (type || "Carousel") as ContentType,
          status: "Submitted",
          date: scheduleDate,
          caption: topic.trim(),
          body: body,
          hashtags: [],
          cta: "",
          notes: `Scheduled for ${scheduledDateTime.toLocaleString()} on ${page.name} (Post ID: ${data.postId})`,
          media: mediaPreview ? [mediaPreview] : [],
        });
        toast.success(`Scheduled for ${scheduledDateTime.toLocaleString()}!`);
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
            Back
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
                  <SelectValue placeholder="Select Goal" />
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
              <Select value={platform} onValueChange={(v) => {
                const p = v as SocialPlatform;
                setPlatform(p);
                if (p === "Blog") {
                  setType("Blog Article");
                } else if (type === "Blog Article") {
                  setType("" as ContentType);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Platform" />
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
              <Select value={type} onValueChange={(v) => setType(v as ContentType)} disabled={isBlog}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {availableContentTypes.map((t) => (
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

          {isFacebook && canPublish && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Send className="size-4" />
                Facebook Publishing
              </div>
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
            </div>
          )}

          {isGBP && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setGbpExpanded((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4285F4"/>
                  </svg>
                  Google Business Profile Options
                </div>
                <svg
                  className={`size-4 text-muted-foreground transition-transform duration-200 ${gbpExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {gbpExpanded && (
                <div className="border-t px-4 py-4 space-y-4">
                  {/* Call to Action */}
                  {gbpType === "Call to Action" && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Row label="Type *">
                        <Select value={gbpType} onValueChange={(v) => setGbpType(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Call to Action">Call to Action</SelectItem>
                            <SelectItem value="Event">Event</SelectItem>
                            <SelectItem value="Offer">Offer</SelectItem>
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row label="Select button label">
                        <Select value={gbpButtonLabel} onValueChange={setGbpButtonLabel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a label" />
                          </SelectTrigger>
                          <SelectContent>
                            {["None", "Book", "Order", "Shop", "Learn More", "Sign Up", "Call"].map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                      {gbpButtonLabel && gbpButtonLabel !== "None" && gbpButtonLabel !== "Call" && (
                        <Row label="URL *">
                          <Input type="url" value={gbpUrl} onChange={(e) => setGbpUrl(e.target.value)} placeholder="https://www..." required />
                        </Row>
                      )}
                    </div>
                  )}

                  {/* Event */}
                  {gbpType === "Event" && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <Row label="Type *">
                          <Select value={gbpType} onValueChange={(v) => setGbpType(v as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Call to Action">Call to Action</SelectItem>
                              <SelectItem value="Event">Event</SelectItem>
                              <SelectItem value="Offer">Offer</SelectItem>
                            </SelectContent>
                          </Select>
                        </Row>
                        <Row label="Start date *">
                          <Input type="datetime-local" value={gbpStartDate} onChange={(e) => setGbpStartDate(e.target.value)} required />
                        </Row>
                        <Row label="End date *">
                          <Input type="datetime-local" value={gbpEndDate} onChange={(e) => setGbpEndDate(e.target.value)} required />
                        </Row>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Row label="Title *">
                          <Input value={gbpTitle} onChange={(e) => setGbpTitle(e.target.value)} placeholder="(eg) Summer sale 25%" required />
                        </Row>
                        <Row label="Select button label">
                          <Select value={gbpButtonLabel} onValueChange={setGbpButtonLabel}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a label" />
                            </SelectTrigger>
                            <SelectContent>
                              {["None", "Book", "Order", "Shop", "Learn More", "Sign Up", "Call"].map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Row>
                      </div>
                      {gbpButtonLabel && gbpButtonLabel !== "None" && gbpButtonLabel !== "Call" && (
                        <Row label="URL *">
                          <Input type="url" value={gbpUrl} onChange={(e) => setGbpUrl(e.target.value)} placeholder="https://www..." required />
                        </Row>
                      )}
                    </>
                  )}

                  {/* Offer */}
                  {gbpType === "Offer" && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <Row label="Type *">
                          <Select value={gbpType} onValueChange={(v) => setGbpType(v as any)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Call to Action">Call to Action</SelectItem>
                              <SelectItem value="Event">Event</SelectItem>
                              <SelectItem value="Offer">Offer</SelectItem>
                            </SelectContent>
                          </Select>
                        </Row>
                        <Row label="Start date *">
                          <Input type="datetime-local" value={gbpStartDate} onChange={(e) => setGbpStartDate(e.target.value)} required />
                        </Row>
                        <Row label="End date *">
                          <Input type="datetime-local" value={gbpEndDate} onChange={(e) => setGbpEndDate(e.target.value)} required />
                        </Row>
                      </div>
                      <Row label="Title *">
                        <Input value={gbpTitle} onChange={(e) => setGbpTitle(e.target.value)} placeholder="(eg) Summer sale 25%" required />
                      </Row>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Row label="Coupon Code *">
                          <Input value={gbpCouponCode} onChange={(e) => setGbpCouponCode(e.target.value)} placeholder="(eg) SALE25" required />
                        </Row>
                        <Row label="Redeem Link *">
                          <Input type="url" value={gbpRedeemLink} onChange={(e) => setGbpRedeemLink(e.target.value)} placeholder="https://www..." required />
                        </Row>
                      </div>
                      <Row label="Terms">
                        <Textarea rows={3} value={gbpTerms} onChange={(e) => setGbpTerms(e.target.value)} placeholder="Terms and conditions..." />
                      </Row>
                    </>
                  )}

                  {/* Default: no type selected */}
                  {gbpType === "" && (
                    <Row label="Type *">
                      <Select value={gbpType} onValueChange={(v) => setGbpType(v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Call to Action">Call to Action</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="Offer">Offer</SelectItem>
                        </SelectContent>
                      </Select>
                    </Row>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm">Publish Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPublishMode("now")}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  publishMode === "now"
                    ? "border-green-500 bg-green-500/5 shadow-md shadow-green-500/10"
                    : "border-muted hover:border-green-300 hover:bg-green-500/5"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  publishMode === "now"
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-green-100 group-hover:text-green-600"
                }`}>
                  <Send className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${
                  publishMode === "now" ? "text-green-700" : "text-foreground"
                }`}>
                  Publish Now
                </span>
                <span className="text-xs text-muted-foreground">Post immediately</span>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode("later")}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  publishMode === "later"
                    ? "border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10"
                    : "border-muted hover:border-blue-300 hover:bg-blue-500/5"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  publishMode === "later"
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-blue-100 group-hover:text-blue-600"
                }`}>
                  <CalendarClock className="h-4 w-4" />
                </div>
                <span className={`text-sm font-semibold ${
                  publishMode === "later" ? "text-blue-700" : "text-foreground"
                }`}>
                  Schedule For Later
                </span>
                <span className="text-xs text-muted-foreground">Pick date & time</span>
              </button>
            </div>

            {publishMode === "later" && (
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <Row label="Timezone">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Row label="Date">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </Row>
                  <Row label="Time">
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </Row>
                </div>
              </div>
            )}

            {publishMode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPublishMode(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!!(loading || !platform || !type || !goal || (publishMode === "later" && (!scheduleDate || !scheduleTime)) || (publishMode === "now" && isFacebook && canPublish && !selectedPage))}
                  onClick={() => {
                    if (publishMode === "now") {
                      if (isFacebook && canPublish) {
                        publishNow();
                      } else {
                        generate();
                      }
                    } else {
                      if (isFacebook && canPublish && selectedPage) {
                        scheduleFacebookPost();
                      } else {
                        toast.success(`Scheduled for ${scheduleDate} ${scheduleTime} (${timezone})`);
                        navigate({ to: "/submitted" });
                      }
                    }
                  }}
                >
                  {loading || publishing ? "Processing…" : publishMode === "now" ? "Publish Post" : "Schedule Post"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold">Post Preview</h2>
          <p className="text-xs text-muted-foreground">
            This is how your post will appear on the platform.
          </p>

          {platform ? (
            <SocialMediaPreviewCard
              profileName={selectedPage ? (pages.find((p) => p.id === selectedPage)?.name || client?.name || "Your Business") : (client?.name || "Your Business")}
              profileImage={selectedPage ? `https://graph.facebook.com/${selectedPage}/picture?height=80&width=80` : undefined}
              timestamp={new Date()}
              content={body || topic || "Your post content will appear here..."}
              images={mediaPreview ? [{ src: mediaPreview, alt: "Uploaded media" }] : []}
              platform={(() => {
                const p = platform.toLowerCase();
                if (p === "x (twitter)" || p === "x/twitter") return "twitter";
                if (p === "youtube") return "youtube";
                if (p === "tiktok") return "tiktok";
                if (p === "threads") return "threads";
                if (p === "reddit") return "reddit";
                return p as any;
              })()}
              likes={0}
              comments={0}
              shares={0}
              gbpTitle={gbpTitle}
              gbpButtonLabel={gbpButtonLabel}
              gbpIsVerified={true}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 py-12 text-center">
              <Image className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a platform to preview your post</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.type.startsWith("video/")) {
                  handleVideoUpload(e.target.files);
                } else {
                  handleImageUpload(e.target.files);
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="w-full"
            >
              <Image className="mr-2 size-4" />
              Upload Image/Video
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAiGen((p) => !p)}
              className="w-full"
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              AI Generate Image/Video
            </Button>

            {/* AI Generation Panel */}
            {showAiGen && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                {/* Reference Image OR GBP URL */}
                <div className="space-y-2">
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
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                </div>

                {/* Image Prompt */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Image prompt (used to generate this image)</Label>
                  <Textarea
                    rows={3}
                    value={aiImagePrompt}
                    onChange={(e) => setAiImagePrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="text-xs"
                  />
                </div>

                {/* Run Button */}
                <Button
                  className="w-full"
                  onClick={() => {
                    toast.success("AI generation started...");
                  }}
                >
                  <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Run
                </Button>
              </div>
            )}

            {/* Replace Image - show when media is uploaded */}
            {mediaPreview && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full"
                >
                  <Image className="mr-2 size-4" />
                  Replace Image
                </Button>
                <Button
                  variant="destructive"
                  onClick={removeMedia}
                  className="w-full"
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove Media
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
