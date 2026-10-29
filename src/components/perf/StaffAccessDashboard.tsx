import { useEffect, useState } from "react";
import { RefreshCw, Mail, Pencil, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { staffSignInStatus, validStaffEmail, type StaffSignIn } from "@/lib/staffAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Staff = { uuid: string; first_name: string; last_name: string; email: string | null; title: string | null; department: string | null; user_id: string | null };
type Access = StaffSignIn & { employee_uuid: string; account_email: string | null };
type Props = { onSaved: () => void };

export function StaffAccessDashboard({ onSaved }: Props) {
  const { loading: permissionLoading, grantedRoles } = usePermissions();
  const allowed = grantedRoles.includes("admin") || grantedRoles.includes("hr");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [access, setAccess] = useState<Record<string, Access>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Staff | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const [people, accounts] = await Promise.all([
      supabase.from("employees").select("uuid,first_name,last_name,email,title,department,user_id").eq("terminated", false).order("first_name"),
      supabase.rpc("admin_staff_access"),
    ]);
    if (people.error || accounts.error) {
      setError(people.error?.message ?? accounts.error?.message ?? "Unable to load staff access");
    } else {
      setStaff(people.data ?? []);
      setAccess(Object.fromEntries((accounts.data ?? []).map(row => [row.employee_uuid, row])));
    }
    setLoading(false);
  }

  useEffect(() => { if (!permissionLoading && allowed) void load(); }, [permissionLoading, allowed]);

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || saving || !validStaffEmail(email)) return;
    setSaving(true);
    try {
      const { error: saveError } = await supabase.rpc("admin_set_staff_email", { _employee_uuid: editing.uuid, _email: email.trim() });
      if (saveError) { toast.error(saveError.message); return; }
      toast.success("Work email saved");
      setEditing(null);
      await load();
      onSaved();
    } finally { setSaving(false); }
  }

  const missing = staff.filter(person => !person.email?.trim()).length;
  const signedIn = staff.filter(person => staffSignInStatus(access[person.uuid]) === "Has signed in").length;
  const visible = staff.filter(person => {
    const status = staffSignInStatus(access[person.uuid]);
    if (filter === "missing" && person.email?.trim()) return false;
    if (filter === "signed" && status !== "Has signed in") return false;
    if (filter === "pending" && status === "Has signed in") return false;
    return `${person.first_name} ${person.last_name} ${person.email ?? ""} ${person.department ?? ""} ${person.title ?? ""}`.toLowerCase().includes(search.toLowerCase());
  });

  if (permissionLoading) return <p className="text-muted-foreground">Loading staff access…</p>;
  if (!allowed) return <p className="text-muted-foreground">Admin or HR access is required to view staff sign-in records.</p>;
  return <section className="space-y-5" aria-label="Staff sign-in dashboard">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Staff sign-in</h2>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
    </div>
    {error ? <div role="alert" className="text-destructive">{error}</div> : <>
      <div className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
        {[{ label: "Active staff", count: staff.length }, { label: "Have signed in", count: signedIn }, { label: "Not signed in", count: staff.length - signedIn }, { label: "Missing email", count: missing }].map(item =>
          <div key={item.label}><div className="text-3xl font-semibold">{loading ? "—" : item.count}</div><div className="text-sm text-muted-foreground">{item.label}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search staff" className="pl-9" placeholder="Search staff, department, or email" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48" aria-label="Sign-in filter"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All staff</SelectItem><SelectItem value="missing">Missing email</SelectItem><SelectItem value="pending">Not signed in</SelectItem><SelectItem value="signed">Have signed in</SelectItem>
        </SelectContent></Select>
        <Button variant={filter === "missing" ? "secondary" : "outline"} onClick={() => setFilter(filter === "missing" ? "all" : "missing")}><Mail className="mr-2 h-4 w-4" />Missing email ({missing})</Button>
      </div>
      <Table><TableHeader><TableRow><TableHead>Staff member</TableHead><TableHead>Work email</TableHead><TableHead>Sign-in status</TableHead><TableHead>Last sign-in</TableHead><TableHead>Employee link</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={5}>Loading staff…</TableCell></TableRow> : visible.map(person => {
          const account = access[person.uuid];
          const status = staffSignInStatus(account);
          return <TableRow key={person.uuid}>
            <TableCell className="min-w-48"><div className="font-medium">{person.first_name} {person.last_name}</div><div className="text-xs text-muted-foreground">{person.title}</div><div className="text-xs text-muted-foreground">{person.department}</div></TableCell>
            <TableCell><div className="flex items-center gap-2"><span className="text-sm">{person.email || "No email on file"}</span>{(!person.user_id || !person.email) && <Button variant="ghost" size="icon" aria-label={`${person.email ? "Edit" : "Add"} email for ${person.first_name} ${person.last_name}`} title={person.email ? "Edit work email" : "Add work email"} onClick={() => { setEditing(person); setEmail(person.email ?? ""); }}><Pencil className="h-4 w-4" /></Button>}</div></TableCell>
            <TableCell><Badge variant={status === "Has signed in" ? "default" : "outline"} className="whitespace-nowrap">{status}</Badge></TableCell>
            <TableCell className="text-xs whitespace-nowrap">{account?.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleString() : "—"}</TableCell>
            <TableCell className="text-sm whitespace-nowrap">{person.user_id ? (account?.account_id ? "Linked" : "Account missing") : account?.account_id ? "Not linked yet" : "No account"}{account?.account_email && person.email?.toLowerCase() !== account.account_email.toLowerCase() && <div className="text-xs text-muted-foreground">Sign-in: {account.account_email}</div>}</TableCell>
          </TableRow>;
        })}{!loading && visible.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No staff match these filters.</TableCell></TableRow>}</TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">{visible.length} of {staff.length} active staff · Sign-in dates reflect recorded account activity, not who is online now.</p>
    </>}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent>
      <form onSubmit={saveEmail} className="space-y-4"><DialogHeader><DialogTitle>Work email · {editing?.first_name} {editing?.last_name}</DialogTitle><DialogDescription>This updates the staff record. It does not create an account or send an invitation.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label htmlFor="staff-work-email">Work email</Label><Input id="staff-work-email" type="email" autoComplete="off" required value={email} onChange={event => setEmail(event.target.value)} /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving || !validStaffEmail(email)}>{saving ? "Saving…" : "Save email"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </section>;
}