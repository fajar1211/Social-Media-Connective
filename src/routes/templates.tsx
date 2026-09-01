import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Filter,
  LayoutTemplate,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, type Platform, type ContentType, SOCIAL_PLATFORMS, CONTENT_TYPES } from "@/lib/content-store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Social Media Connective" },
      { name: "description", content: "Content templates for quick creation." },
      { property: "og:title", content: "Templates — Social Media Connective" },
    ],
  }),
  component: TemplatesPage,
});

const STORAGE_KEY = "socmedconnective-templates";

type Template = {
  id: string;
  name: string;
  description: string;
  platform: SocialPlatform;
  contentType: string;
  caption: string;
  hashtags: string[];
  cta: string;
  createdAt: string;
};

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: Template[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const defaultTemplates: Template[] = [
  {
    id: "tpl-1",
    name: "Product Promotion",
    description: "Standard product promotion post with CTA",
    platform: "Facebook",
    contentType: "Image",
    caption: "Introducing [Product Name]! 🎉\n\n[Benefit 1]\n[Benefit 2]\n[Benefit 3]\n\n👉 [CTA]",
    hashtags: ["#product", "#promotion", "#new"],
    cta: "Shop now",
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-2",
    name: "Behind the Scenes",
    description: "Behind-the-scenes content for engagement",
    platform: "Instagram",
    contentType: "Carousel",
    caption: "Ever wonder what goes on behind the scenes? 🎬\n\nSwipe through to see how we [process].\n\n#behindthescenes",
    hashtags: ["#behindthescenes", "#bts", "#teamwork"],
    cta: "Follow for more",
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-3",
    name: "Educational Tip",
    description: "Quick educational content for authority building",
    platform: "LinkedIn",
    contentType: "Text Post",
    caption: "💡 Did you know?\n\n[Fact or tip]\n\nThis is important because [reason].\n\nWhat are your thoughts?",
    hashtags: ["#tips", "#education", "#learning"],
    cta: "Share your experience",
    createdAt: new Date().toISOString(),
  },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const { clients } = useStore();
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = loadTemplates();
    return saved.length > 0 ? saved : defaultTemplates;
  });
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<Template | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>("Facebook");
  const [formContentType, setFormContentType] = useState("Image");
  const [formCaption, setFormCaption] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [formCta, setFormCta] = useState("");

  const filtered = useMemo(() => {
    let list = templates;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    if (platformFilter !== "all") {
      list = list.filter((t) => t.platform === platformFilter);
    }
    return list;
  }, [templates, query, platformFilter]);

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormPlatform("Facebook");
    setFormContentType("Image");
    setFormCaption("");
    setFormHashtags("");
    setFormCta("");
  };

  const handleAdd = () => {
    if (!formName.trim()) {
      toast.error("Template name is required");
      return;
    }
    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim(),
      platform: formPlatform,
      contentType: formContentType,
      caption: formCaption,
      hashtags: formHashtags
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
      cta: formCta,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setAdding(false);
    resetForm();
    toast.success("Template created");
  };

  const handleEdit = () => {
    if (!editing || !formName.trim()) return;
    const updated = templates.map((t) =>
      t.id === editing.id
        ? {
            ...t,
            name: formName.trim(),
            description: formDesc.trim(),
            platform: formPlatform,
            contentType: formContentType,
            caption: formCaption,
            hashtags: formHashtags
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean),
            cta: formCta,
          }
        : t
    );
    setTemplates(updated);
    saveTemplates(updated);
    setEditing(null);
    resetForm();
    toast.success("Template updated");
  };

  const handleDelete = () => {
    if (!deleting) return;
    const updated = templates.filter((t) => t.id !== deleting.id);
    setTemplates(updated);
    saveTemplates(updated);
    setDeleting(null);
    toast.success("Template deleted");
  };

  const handleUseTemplate = (template: Template) => {
    // Store template data in sessionStorage for the create page to pick up
    sessionStorage.setItem(
      "socmedconnective-use-template",
      JSON.stringify(template)
    );
    navigate({ to: "/content/create" });
  };

  const handleDuplicate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    toast.success("Template duplicated");
  };

  const openEditDialog = (template: Template) => {
    setEditing(template);
    setFormName(template.name);
    setFormDesc(template.description);
    setFormPlatform(template.platform);
    setFormContentType(template.contentType);
    setFormCaption(template.caption);
    setFormHashtags(template.hashtags.join(", "));
    setFormCta(template.cta);
  };

  const openAddDialog = () => {
    resetForm();
    setAdding(true);
  };

  return (
    <>
      <PageHeader
        title="Content Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? "s" : ""} · Create reusable content frameworks`}
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 size-4" />
            Create Template
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
              <LayoutTemplate className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">
              {templates.length === 0 ? "No templates yet" : "No templates match your search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {templates.length === 0
                ? "Create your first template to speed up content creation."
                : "Try adjusting your search or filter."}
            </p>
            {templates.length === 0 && (
              <Button className="mt-6" onClick={openAddDialog}>
                <Plus className="mr-2 size-4" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => (
              <Card key={template.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1 text-xs line-clamp-2">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                      {template.platform}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <p className="text-xs line-clamp-4 text-muted-foreground">
                        {template.caption || "No caption"}
                      </p>
                    </div>
                    {template.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.hashtags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        {template.hashtags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{template.hashtags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <FileText className="mr-1 size-3" />
                        Use Template
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(template)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Template Dialog */}
      <Dialog
        open={adding || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Product Launch"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={formPlatform} onValueChange={(v) => setFormPlatform(v as SocialPlatform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Content Type</Label>
                <Select value={formContentType} onValueChange={setFormContentType}>
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
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Caption Template</Label>
              <Textarea
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                placeholder="Write your caption template here. Use [brackets] for placeholders."
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hashtags (comma separated)</Label>
              <Input
                value={formHashtags}
                onChange={(e) => setFormHashtags(e.target.value)}
                placeholder="#hashtag1, #hashtag2, #hashtag3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Call to Action</Label>
              <Input
                value={formCta}
                onChange={(e) => setFormCta(e.target.value)}
                placeholder="e.g. Shop now, Learn more"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editing ? handleEdit : handleAdd}>
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
