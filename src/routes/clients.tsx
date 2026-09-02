import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Inbox,
  Building2,
  Globe,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientStatusBadge, PlatformBadge } from "@/components/badges";
import { actions, useStore, counts, type Client, type Platform } from "@/lib/content-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Social Media Connective Admin" },
      { name: "description", content: "Manage the clients your marketing content belongs to." },
      { property: "og:title", content: "Clients — Social Media Connective Admin" },
      {
        property: "og:description",
        content: "Manage the clients your marketing content belongs to.",
      },
    ],
  }),
  component: ClientsPage,
});

function ClientCard({
  client,
  contentCount,
  onEdit,
  onView,
  onDelete,
}: {
  client: Client;
  contentCount: number;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="cursor-pointer rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-accent/40"
      onClick={() => navigate({ to: "/clients/$clientId", params: { clientId: client.id } })}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{client.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {contentCount} content item{contentCount !== 1 ? "s" : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 size-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 size-4" /> Edit Name
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ClientStatusBadge active={client.active} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {client.platforms.length > 0 ? (
          client.platforms.map((p) => <PlatformBadge key={p} platform={p} />)
        ) : (
          <span className="text-xs text-muted-foreground">No platforms</span>
        )}
      </div>
    </div>
  );
}

function ClientsPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== "/clients";
  const { profile } = useAuth();

  if (isChildRoute) {
    return <Outlet />;
  }

  const isAdmin = profile?.role === "admin";
  const isClient = profile?.role === "client";
  const myClientId = profile?.clientId;

  const { clients, content } = useStore();

  // Client role: show only their own client
  const myClient = isClient && myClientId ? clients.find((c) => c.id === myClientId) : null;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [adding, setAdding] = useState(false);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");

  const [editing, setEditing] = useState<Client | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editName, setEditName] = useState("");

  const [viewing, setViewing] = useState<Client | null>(null);

  const [deleting, setDeleting] = useState<Client | null>(null);

  // Client without assigned client - show setup options
  if (isClient && !myClientId) {
    return (
      <>
        <PageHeader
          title="Set Up Your Profile"
          subtitle="Choose how you want to get started."
        />

        <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
          {/* Option 1: Connect with Marketing Connective */}
          <a
            href="https://www.marketingconnective.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-center transition-all hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Globe className="size-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Connect Account</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sign in with your Marketing Connective account for seamless integration.
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 group-hover:text-violet-700">
                Go to Marketing Connective
                <ExternalLink className="size-3.5" />
              </div>
            </div>
          </a>

          {/* Option 2: Add Personal */}
          <button
            onClick={() => setAdding(true)}
            className="group relative overflow-hidden rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-8 text-center transition-all hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <UserPlus className="size-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Add Personal</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Create a personal profile to start managing your content right away.
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 group-hover:text-cyan-700">
                Create Profile
                <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </button>
        </div>

        <Dialog
          open={adding}
          onOpenChange={(o) => {
            if (!o) {
              setAdding(false);
              setClientId("");
              setName("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>Profile Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Business"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    const cid = "client-" + Date.now();
                    actions.addClient(cid, name.trim(), []);
                    toast.success("Profile created! Please contact admin to link your account.");
                    setAdding(false);
                    setClientId("");
                    setName("");
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAdding(false); setClientId(""); setName(""); }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!name.trim()) {
                    toast.error("Enter a profile name.");
                    return;
                  }
                  const cid = "client-" + Date.now();
                  actions.addClient(cid, name.trim(), []);
                  toast.success("Profile created! Please contact admin to link your account.");
                  setAdding(false);
                  setClientId("");
                  setName("");
                }}
              >
                Create Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Client with assigned client - show their client read-only
  if (isClient && myClient) {
    const myContent = content.filter((i) => i.clientId === myClientId);
    const c = counts(myContent);

    return (
      <>
        <PageHeader
          title="My Client"
          subtitle={myClient.name}
        />

        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">{myClient.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <ClientStatusBadge active={myClient.active} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {myClient.platforms.length > 0 ? (
                  myClient.platforms.map((p) => <PlatformBadge key={p} platform={p} />)
                ) : (
                  <span className="text-xs text-muted-foreground">No platforms assigned</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["Suggested", "Additional", "Submitted", "Approved", "Deleted"] as const).map((status) => (
              <div key={status} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-semibold tabular-nums">{c[status]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{status}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Admin view - full client management
  const filtered = useMemo(() => {
    let list = clients;
    if (query.trim()) {
      list = list.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
    }
    if (statusFilter === "active") list = list.filter((c) => c.active);
    if (statusFilter === "inactive") list = list.filter((c) => !c.active);
    return list;
  }, [clients, query, statusFilter]);

  const contentCount = (clientName: string) =>
    content.filter((i) => i.client === clientName).length;

  const clientContent = (clientName: string) =>
    content
      .filter((i) => i.client === clientName)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

  const resetDialogs = () => {
    setAdding(false);
    setClientId("");
    setName("");
    setEditing(null);
    setEditClientId("");
    setEditName("");
    setViewing(null);
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? "s" : ""} total · ${clients.filter((c) => c.active).length} active`}
        actions={<Button onClick={() => setAdding(true)}>Add Client</Button>}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">
              {clients.length === 0 ? "No clients yet" : "No clients match your search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients.length === 0
                ? "Add your first client to get started."
                : "Try adjusting your search or filter."}
            </p>
            {clients.length === 0 && (
              <Button className="mt-6" onClick={() => setAdding(true)}>
                Add Client
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border bg-card shadow-soft md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Client Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => navigate({ to: "/clients/$clientId", params: { clientId: c.id } })}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <ClientStatusBadge active={c.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {c.platforms.length > 0 ? (
                            c.platforms.map((p) => (
                              <PlatformBadge key={p} platform={p} />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {contentCount(c.name)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={() => setViewing(c)}
                            >
                              <Eye className="mr-2 size-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(c);
                                setEditClientId(c.id);
                                setEditName(c.name);
                              }}
                            >
                              <Pencil className="mr-2 size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleting(c)}
                            >
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filtered.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  contentCount={contentCount(c.name)}
                  onEdit={() => {
                    setEditing(c);
                    setEditClientId(c.id);
                    setEditName(c.name);
                  }}
                  onView={() => setViewing(c)}
                  onDelete={() => setDeleting(c)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={adding}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setClientId("");
            setName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Client ID</Label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 435522"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientId.trim() && name.trim()) {
                  actions.addClient(clientId.trim(), name.trim(), []);
                  toast.success("Client added");
                  setAdding(false);
                  setClientId("");
                  setName("");
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Unique ID for the client. Used in URL: /clients/{"<this-id>"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Client Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientId.trim() && name.trim()) {
                  actions.addClient(clientId.trim(), name.trim(), []);
                  toast.success("Client added");
                  setAdding(false);
                  setClientId("");
                  setName("");
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setClientId("");
                setName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!clientId.trim()) {
                  toast.error("Enter a client ID.");
                  return;
                }
                if (!name.trim()) {
                  toast.error("Enter a client name.");
                  return;
                }
                if (clients.some((c) => c.id === clientId.trim())) {
                  toast.error("Client ID already exists.");
                  return;
                }
                actions.addClient(clientId.trim(), name.trim(), []);
                toast.success("Client added");
                setAdding(false);
                setClientId("");
                setName("");
              }}
            >
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setEditClientId("");
            setEditName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Client ID</Label>
            <Input
              value={editClientId}
              onChange={(e) => setEditClientId(e.target.value)}
              placeholder="e.g. 435522"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editClientId.trim() && editName.trim() && editing) {
                  if (editClientId.trim() !== editing.id && clients.some((c) => c.id === editClientId.trim())) {
                    toast.error("Client ID already exists.");
                    return;
                  }
                  actions.updateClient(editing.id, { id: editClientId.trim(), name: editName.trim() });
                  toast.success("Client updated");
                  setEditing(null);
                  setEditClientId("");
                  setEditName("");
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Client name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editClientId.trim() && editName.trim() && editing) {
                  if (editClientId.trim() !== editing.id && clients.some((c) => c.id === editClientId.trim())) {
                    toast.error("Client ID already exists.");
                    return;
                  }
                  actions.updateClient(editing.id, { id: editClientId.trim(), name: editName.trim() });
                  toast.success("Client updated");
                  setEditing(null);
                  setEditClientId("");
                  setEditName("");
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                {editing?.active ? "Client is currently active" : "Client is currently inactive"}
              </p>
            </div>
            <Switch
              checked={editing?.active ?? true}
              onCheckedChange={(checked) => {
                if (editing) {
                  actions.updateClient(editing.id, { active: checked });
                  setEditing({ ...editing, active: checked });
                  toast.success(`Client ${checked ? "activated" : "deactivated"}`);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setEditClientId("");
                setEditName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editClientId.trim()) {
                  toast.error("Enter a client ID.");
                  return;
                }
                if (!editName.trim()) {
                  toast.error("Enter a client name.");
                  return;
                }
                if (editing) {
                  if (editClientId.trim() !== editing.id && clients.some((c) => c.id === editClientId.trim())) {
                    toast.error("Client ID already exists.");
                    return;
                  }
                  actions.updateClient(editing.id, { id: editClientId.trim(), name: editName.trim() });
                  toast.success("Client updated");
                  setEditing(null);
                  setEditClientId("");
                  setEditName("");
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <ClientStatusBadge active={viewing.active} />
              </div>

              <div>
                <p className="mb-2 text-muted-foreground">Platforms</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewing.platforms.length > 0 ? (
                    viewing.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))
                  ) : (
                    <span className="text-muted-foreground">No platforms assigned.</span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-muted-foreground">
                  {contentCount(viewing.name)} total content item{contentCount(viewing.name) !== 1 ? "s" : ""}
                </p>
                {clientContent(viewing.name).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Recent Content
                    </p>
                    {clientContent(viewing.name).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.platform} · {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/content"
                onClick={() => setViewing(null)}
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                View all content →
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client. Content associated with this client will
              not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  actions.deleteClient(deleting.id);
                  toast.success("Client deleted");
                  setDeleting(null);
                }
              }}
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
