import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Social Media Connective Admin" },
      { name: "description", content: "Workspace preferences for the content admin dashboard." },
      { property: "og:title", content: "Settings — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Workspace preferences for the content admin dashboard.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [workspace, setWorkspace] = useState("Social Media Connective");
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [notify, setNotify] = useState(true);

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace preferences and defaults." />
      <div className="max-w-xl space-y-4">
        <div className="space-y-1.5 rounded-xl border bg-card p-5 shadow-soft">
          <Label>Workspace Name</Label>
          <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-soft">
          <div>
            <p className="text-sm font-medium">Auto-submit generated content</p>
            <p className="text-xs text-muted-foreground">
              Newly generated content goes straight to Submitted.
            </p>
          </div>
          <Switch checked={autoSubmit} onCheckedChange={setAutoSubmit} />
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-soft">
          <div>
            <p className="text-sm font-medium">Approval notifications</p>
            <p className="text-xs text-muted-foreground">Notify the team when content is approved.</p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
        <Button onClick={() => toast.success("Settings saved")}>Save Settings</Button>
      </div>
    </>
  );
}
