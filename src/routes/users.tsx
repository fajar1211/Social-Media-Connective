import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Shield,
  User,
  Inbox,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Profile, Client } from "@/lib/database.types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Social Media Connective" },
      { name: "description", content: "Manage users and their access roles." },
      { property: "og:title", content: "Users — Social Media Connective" },
    ],
  }),
  component: UsersPage,
});

function RoleBadge({ role, isProtected }: { role: string; isProtected?: boolean }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"} className="gap-1">
      {role === "admin" ? <Shield className="size-3" /> : <User className="size-3" />}
      {role === "admin" ? (isProtected ? "Admin (Protected)" : "Admin") : "Client"}
    </Badge>
  );
}

function UsersPage() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "client">("client");
  const [newClientId, setNewClientId] = useState<string>("");

  const [editing, setEditing] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "client">("client");
  const [editClientId, setEditClientId] = useState<string>("");

  const [deleting, setDeleting] = useState<Profile | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [profiles, clientList] = await Promise.all([
      supabaseConfigured ? db.getAllProfiles() : Promise.resolve([]),
      supabaseConfigured ? db.getClients() : Promise.resolve([]),
    ]);
    setUsers(profiles);
    setClients(clientList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name && u.full_name.toLowerCase().includes(q))
      );
    }
    if (roleFilter === "admin") list = list.filter((u) => u.role === "admin");
    if (roleFilter === "client") list = list.filter((u) => u.role === "client");
    return list;
  }, [users, query, roleFilter]);

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "—";
    return clients.find((c) => c.id === clientId)?.name || clientId;
  };

  const handleAddUser = async () => {
    if (!newEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!supabaseConfigured) {
      toast.error("User management requires Supabase");
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: newEmail.trim(),
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: newName.trim(),
        role: newRole,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      await db.createProfile({
        id: data.user.id,
        email: newEmail.trim(),
        full_name: newName.trim() || null,
        role: newRole,
        client_id: newRole === "client" ? (newClientId || null) : null,
      });
      toast.success("User created");
      setAdding(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("client");
      setNewClientId("");
      loadData();
    }
  };

  const handleUpdateUser = async () => {
    if (!editing) return;

    const { error } = await supabase.auth.admin.updateUserById(editing.id, {
      user_metadata: {
        role: editRole,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    await db.updateProfile(editing.id, {
      role: editRole,
      client_id: editRole === "client" ? (editClientId || null) : null,
    });

    toast.success("User updated");
    setEditing(null);
    loadData();
  };

  const handleDeleteUser = async () => {
    if (!deleting) return;

    const { error } = await supabase.auth.admin.deleteUser(deleting.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    await db.deleteProfile(deleting.id);
    toast.success("User deleted");
    setDeleting(null);
    loadData();
  };

  if (currentProfile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <Shield className="mb-4 size-11 text-muted-foreground" strokeWidth={1.75} />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only administrators can manage users.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${users.length} user${users.length !== 1 ? "s" : ""} total · ${users.filter((u) => u.role === "admin").length} admin (protected) · ${users.filter((u) => u.role === "client").length} client${users.filter((u) => u.role === "client").length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="mr-2 size-4" />
            Add User
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
              placeholder="Search users"
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium">
              {users.length === 0 ? "No users yet" : "No users match your search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {users.length === 0
                ? "Add your first user to get started."
                : "Try adjusting your search or filter."}
            </p>
            {users.length === 0 && (
              <Button className="mt-6" onClick={() => setAdding(true)}>
                <UserPlus className="mr-2 size-4" />
                Add User
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isAdminUser = u.role === "admin";
                  return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} isProtected={isAdminUser} />
                    </TableCell>
                    <TableCell>{getClientName(u.client_id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdminUser ? (
                        <span className="text-xs text-muted-foreground italic">Protected</span>
                      ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(u);
                              setEditRole(u.role as "admin" | "client");
                              setEditClientId(u.client_id || "");
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleting(u)}
                          >
                            <Trash2 className="mr-2 size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog
        open={adding}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setNewEmail("");
            setNewName("");
            setNewPassword("");
            setNewRole("client");
            setNewClientId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "client")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Admin role is permanent and can only be changed via database.</p>
            </div>
            {newRole === "client" && (
              <div className="space-y-1.5">
                <Label>Assign Client</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setNewEmail("");
                setNewName("");
                setNewPassword("");
                setNewRole("client");
                setNewClientId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setEditRole("client");
            setEditClientId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{editing.email}</p>
                <p className="text-muted-foreground">{editing.full_name || "No name"}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as "admin" | "client")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === "client" && (
                <div className="space-y-1.5">
                  <Label>Assign Client</Label>
                  <Select value={editClientId} onValueChange={setEditClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setEditRole("client");
                setEditClientId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.email}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this user and revoke their access. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
