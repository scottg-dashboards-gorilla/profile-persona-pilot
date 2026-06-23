import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Link2, ShieldCheck, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AppRole = "admin" | "hr" | "manager";
type RoleRow = { id: string; user_id: string; role: AppRole; created_at: string };
type Employee = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
  user_id: string | null;
};

const ROLE_OPTIONS: AppRole[] = ["admin", "hr", "manager"];

const roleVariant = (r: AppRole) =>
  r === "admin" ? "default" : r === "hr" ? "secondary" : "outline";

export default function AdminAccess() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("manager");
  const [linkEdits, setLinkEdits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [linkUserId, setLinkUserId] = useState("");
  const [linkEmployee, setLinkEmployeeUuid] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    department: "",
  });

  const load = async () => {
    setLoading(true);
    const [rolesRes, empRes] = await Promise.all([
      supabase.from("user_roles").select("id,user_id,role,created_at").order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,title,department,user_id")
        .eq("terminated", false)
        .order("first_name", { ascending: true }),
    ]);
    if (rolesRes.error) toast.error(rolesRes.error.message);
    else setRoles((rolesRes.data ?? []) as RoleRow[]);
    if (empRes.error) toast.error(empRes.error.message);
    else setEmployees((empRes.data ?? []) as Employee[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addRole = async () => {
    if (!newUserId.trim()) {
      toast.error("Paste a user UUID");
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: newUserId.trim(), role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role granted");
    setNewUserId("");
    load();
  };

  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role revoked");
    load();
  };

  const linkEmployee = async (uuid: string, userId: string | null) => {
    const value = userId && userId.trim().length > 0 ? userId.trim() : null;
    const { error } = await supabase.from("employees").update({ user_id: value }).eq("uuid", uuid);
    if (error) return toast.error(error.message);
    toast.success(value ? "Employee linked" : "Link cleared");
    setLinkEdits((s) => {
      const next = { ...s };
      delete next[uuid];
      return next;
    });
    load();
  };

  const useMyId = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      setNewUserId(data.user.id);
      toast.success("Filled with your user ID");
    } else {
      toast.error("Not signed in");
    }
  };

  const linkExisting = async () => {
    if (!linkUserId.trim() || !linkEmployee) {
      toast.error("Pick an employee and paste a user UUID");
      return;
    }
    const { error } = await supabase
      .from("employees")
      .update({ user_id: linkUserId.trim() })
      .eq("uuid", linkEmployee);
    if (error) return toast.error(error.message);
    toast.success("Employee linked");
    setLinkUserId("");
    setLinkEmployeeUuid("");
    load();
  };

  const createAndLink = async () => {
    if (!newEmp.first_name.trim() || !newEmp.last_name.trim() || !newEmp.email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    const payload = {
      first_name: newEmp.first_name.trim(),
      last_name: newEmp.last_name.trim(),
      email: newEmp.email.trim(),
      title: newEmp.title.trim() || null,
      department: newEmp.department.trim() || null,
      user_id: linkUserId.trim() || null,
      terminated: false,
    };
    const { data, error } = await supabase
      .from("employees")
      .insert(payload)
      .select("uuid")
      .single();
    if (error) return toast.error(error.message);
    toast.success(linkUserId.trim() ? "Employee created and linked" : "Employee created");
    setCreateOpen(false);
    setNewEmp({ first_name: "", last_name: "", email: "", title: "", department: "" });
    if (data?.uuid) setLinkEmployeeUuid(data.uuid);
    load();
  };

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (e.first_name ?? "").toLowerCase().includes(q) ||
      (e.last_name ?? "").toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q) ||
      (e.title ?? "").toLowerCase().includes(q)
    );
  });

  const rolesByUser = roles.reduce<Record<string, AppRole[]>>((acc, r) => {
    (acc[r.user_id] ||= []).push(r.role);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Access & Roles
        </h1>
        <p className="text-sm text-muted-foreground">
          Grant admin, HR, or manager roles to authenticated users, and link employee records to their auth account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> Grant a role
          </CardTitle>
          <CardDescription>
            Paste the auth user UUID (visible in Cloud → Users) and choose a role. Only admins can manage roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto_auto] sm:items-end">
            <div>
              <Label htmlFor="uid">User UUID</Label>
              <Input
                id="uid"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={useMyId} type="button">
              Use my ID
            </Button>
            <Button onClick={addRole}>Grant</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current role assignments</CardTitle>
          <CardDescription>{roles.length} active grant{roles.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User UUID</TableHead>
                  <TableHead>Linked employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => {
                  const emp = employees.find((e) => e.user_id === r.user_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                      <TableCell className="text-sm">
                        {emp ? (
                          <span>
                            {emp.first_name} {emp.last_name}
                            <span className="text-muted-foreground"> · {emp.email}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">— not linked —</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleVariant(r.role)}>{r.role}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeRole(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Link an auth user to an employee
          </CardTitle>
          <CardDescription>
            Pick an existing employee or create a new record on the fly, then attach the auth user UUID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div>
              <Label htmlFor="link-uid">Auth user UUID</Label>
              <Input
                id="link-uid"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={linkUserId}
                onChange={(e) => setLinkUserId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label>Employee</Label>
              <Select value={linkEmployee} onValueChange={setLinkEmployeeUuid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee…" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.uuid} value={e.uuid}>
                      {e.first_name} {e.last_name}
                      {e.email ? ` · ${e.email}` : ""}
                      {e.user_id ? " (linked)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" type="button">
                  <UserPlus className="h-4 w-4 mr-1" /> New employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create employee</DialogTitle>
                  <DialogDescription>
                    Add a new employee record. If a user UUID is filled in above, it will be linked automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>First name</Label>
                    <Input
                      value={newEmp.first_name}
                      onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      value={newEmp.last_name}
                      onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newEmp.email}
                      onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newEmp.title}
                      onChange={(e) => setNewEmp({ ...newEmp, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAndLink}>
                    {linkUserId.trim() ? "Create & link" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={linkExisting}>Link</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Link employees to auth users
          </CardTitle>
          <CardDescription>
            Set the auth user UUID for each employee so manager-scoped policies recognize them.
          </CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Search by name, email, or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Auth user UUID</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                const edited = linkEdits[emp.uuid];
                const current = edited ?? emp.user_id ?? "";
                const dirty = edited !== undefined && edited !== (emp.user_id ?? "");
                const userRoles = emp.user_id ? rolesByUser[emp.user_id] ?? [] : [];
                return (
                  <TableRow key={emp.uuid}>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {emp.title}
                      {emp.department && (
                        <div className="text-xs text-muted-foreground">{emp.department}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={current}
                        placeholder="paste auth UUID"
                        onChange={(e) =>
                          setLinkEdits((s) => ({ ...s, [emp.uuid]: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          userRoles.map((r) => (
                            <Badge key={r} variant={roleVariant(r)}>
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          disabled={!dirty}
                          onClick={() => linkEmployee(emp.uuid, current)}
                        >
                          Save
                        </Button>
                        {emp.user_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => linkEmployee(emp.uuid, null)}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}