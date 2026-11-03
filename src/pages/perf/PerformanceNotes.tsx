import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, History, Pencil, CheckCircle2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { NOTE_TYPES, isFormalNote, noteTypeLabel, type NoteType } from "@/lib/performanceNotes";

type Note = {
  id: string; employee_uuid: string; note_type: NoteType; occurred_at: string; title: string; details: string;
  expected_change: string | null; follow_up_date: string | null; witnesses: string | null;
  author_id: string | null; author_name: string | null; employee_ack_at: string | null; employee_ack_comment: string | null;
  created_at: string; updated_at: string;
};
type Emp = { uuid: string; first_name: string; last_name: string; title: string | null; department: string | null; user_id: string | null; manager_uuid: string | null };
type Hist = { id: string; changed_at: string; changed_by_name: string | null; previous: Partial<Note> };

const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
const empty = { employee_uuid: "", note_type: "observation" as NoteType, occurred_at: toLocalInput(new Date().toISOString()), title: "", details: "", expected_change: "", follow_up_date: "", witnesses: "" };

export default function PerformanceNotes() {
  const { viewMode, has } = usePermissions();
  const { toast } = useToast();
  const leader = viewMode !== "employee";
  const [notes, setNotes] = useState<Note[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [editing, setEditing] = useState<Note | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ note: Note; rows: Hist[] } | null>(null);
  const [ackNote, setAckNote] = useState<Note | null>(null);
  const [ackComment, setAckComment] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    const [{ data: n, error }, { data: e }] = await Promise.all([
      supabase.from("performance_notes").select("*").order("occurred_at", { ascending: false }),
      supabase.from("employees").select("uuid, first_name, last_name, title, department, user_id, manager_uuid").eq("terminated", false).order("first_name"),
    ]);
    if (error) toast({ title: "Couldn't load records", description: error.message, variant: "destructive" });
    setNotes((n as Note[]) ?? []);
    setEmps((e as Emp[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empName = (id: string) => { const e = emps.find((x) => x.uuid === id); return e ? `${e.first_name} ${e.last_name}` : "Former employee"; };
  const subjects = useMemo(() => {
    const others = emps.filter((e) => e.user_id !== me);
    if (has("admin") || has("hr")) return others;
    // Managers: everyone below them in the reporting line (direct and indirect reports).
    const mine = emps.find((e) => e.user_id === me)?.uuid;
    if (!mine) return [];
    const byId = new Map(emps.map((e) => [e.uuid, e]));
    const reportsTo = (e: Emp) => {
      let cur = e.manager_uuid, hops = 0;
      while (cur && hops++ < 20) { if (cur === mine) return true; cur = byId.get(cur)?.manager_uuid ?? null; }
      return false;
    };
    return others.filter(reportsTo);
  }, [emps, me, has]);

  const shown = notes.filter((n) => (filterEmp === "all" || n.employee_uuid === filterEmp) && (filterType === "all" || n.note_type === filterType));
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => m.set(n.employee_uuid, (m.get(n.employee_uuid) ?? 0) + 1));
    return m;
  }, [notes]);

  const startNew = () => { setEditing(null); setForm({ ...empty, employee_uuid: filterEmp !== "all" ? filterEmp : "", occurred_at: toLocalInput(new Date().toISOString()) }); setOpen(true); };
  const startEdit = (n: Note) => {
    setEditing(n);
    setForm({ employee_uuid: n.employee_uuid, note_type: n.note_type, occurred_at: toLocalInput(n.occurred_at), title: n.title, details: n.details, expected_change: n.expected_change ?? "", follow_up_date: n.follow_up_date ?? "", witnesses: n.witnesses ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.employee_uuid || !form.title.trim() || !form.details.trim()) { toast({ title: "Pick an employee and fill in the summary and what happened", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      note_type: form.note_type, occurred_at: new Date(form.occurred_at).toISOString(), title: form.title.trim(), details: form.details.trim(),
      expected_change: form.expected_change.trim() || null, follow_up_date: form.follow_up_date || null, witnesses: form.witnesses.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("performance_notes").update(payload).eq("id", editing.id)
      : await supabase.from("performance_notes").insert({ ...payload, employee_uuid: form.employee_uuid, author_id: me });
    setSaving(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Record updated — previous version kept in history" : "Record saved" });
    setOpen(false); load();
  };

  const openHistory = async (note: Note) => {
    const { data } = await supabase.from("performance_note_history").select("id, changed_at, changed_by_name, previous").eq("note_id", note.id).order("changed_at", { ascending: false });
    setHistory({ note, rows: (data as Hist[]) ?? [] });
  };

  const acknowledge = async () => {
    if (!ackNote) return;
    const { error } = await supabase.rpc("acknowledge_performance_note", { _note_id: ackNote.id, _comment: ackComment });
    if (error) { toast({ title: "Couldn't sign", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Signed — thank you" }); setAckNote(null); setAckComment(""); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{leader ? "Performance documentation" : "Formal warnings"}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {leader
              ? "Date- and time-stamped record of performance concerns, from informal observations and verbal warnings through to PIP referral. Visible to HR, admin and everyone above the employee in the reporting line. Employees only see written warnings, final warnings and PIP referrals, and sign to confirm they received them."
              : "Formal warnings your manager or HR has issued. Please read each one and sign to confirm you've received it. Signing doesn't mean you agree — you can add your own comment."}
          </p>
        </div>
        {leader && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Add record</Button>}
      </div>

      {leader && (
        <div className="flex flex-wrap gap-3">
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {subjects.map((e) => <SelectItem key={e.uuid} value={e.uuid}>{e.first_name} {e.last_name}{counts.get(e.uuid) ? ` (${counts.get(e.uuid)})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All record types</SelectItem>
              {NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : shown.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{leader ? "No records yet." : "You have no formal warnings on file."}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {shown.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {isFormalNote(n.note_type) && <ShieldAlert className="h-4 w-4 text-destructive" />}
                      {n.title}
                    </CardTitle>
                    <CardDescription>
                      {leader && <span className="font-medium text-foreground">{empName(n.employee_uuid)} · </span>}
                      Occurred {format(new Date(n.occurred_at), "MMM d, yyyy 'at' h:mm a")} · Logged by {n.author_name ?? "Unknown"} on {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                      {n.updated_at !== n.created_at && ` · Edited ${format(new Date(n.updated_at), "MMM d, yyyy h:mm a")}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isFormalNote(n.note_type) ? "destructive" : "secondary"}>{noteTypeLabel(n.note_type)}</Badge>
                    {isFormalNote(n.note_type) && (n.employee_ack_at
                      ? <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Signed {format(new Date(n.employee_ack_at), "MMM d")}</Badge>
                      : <Badge variant="outline">Awaiting employee signature</Badge>)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap">{n.details}</p>
                {n.expected_change && <p><span className="font-medium">Expected change: </span>{n.expected_change}</p>}
                {n.follow_up_date && <p><span className="font-medium">Follow-up by: </span>{format(new Date(n.follow_up_date + "T00:00"), "MMM d, yyyy")}</p>}
                {leader && n.witnesses && <p><span className="font-medium">Present / witnesses: </span>{n.witnesses}</p>}
                {n.employee_ack_comment && <p className="rounded-md bg-muted p-2"><span className="font-medium">Employee comment: </span>{n.employee_ack_comment}</p>}
                <div className="flex gap-2 pt-1">
                  {leader && <Button size="sm" variant="outline" onClick={() => startEdit(n)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>}
                  {leader && <Button size="sm" variant="ghost" onClick={() => openHistory(n)}><History className="h-3 w-3 mr-1" />Change history</Button>}
                  {!leader && !n.employee_ack_at && <Button size="sm" onClick={() => setAckNote(n)}>Read & sign</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit record" : "Add performance record"}</DialogTitle>
            <DialogDescription>Stick to facts: what happened, when, and what needs to change. {editing && "The previous version is kept in the change history."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee</Label>
              <Select value={form.employee_uuid} onValueChange={(v) => setForm({ ...form, employee_uuid: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                <SelectContent>{subjects.map((e) => <SelectItem key={e.uuid} value={e.uuid}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.note_type} onValueChange={(v) => setForm({ ...form, note_type: v as NoteType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>When it happened</Label><Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">{NOTE_TYPES.find((t) => t.value === form.note_type)?.hint}</p>
            <div><Label>Summary</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Missed three timesheet deadlines in October" /></div>
            <div><Label>What happened</Label><Textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <div><Label>Expected change</Label><Textarea rows={2} value={form.expected_change} onChange={(e) => setForm({ ...form, expected_change: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Follow-up by</Label><Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
              <div><Label>Present / witnesses</Label><Input value={form.witnesses} onChange={(e) => setForm({ ...form, witnesses: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Change history</DialogTitle><DialogDescription>Earlier versions of this record, newest first.</DialogDescription></DialogHeader>
          {history?.rows.length === 0 ? <p className="text-sm text-muted-foreground">Never edited.</p> : history?.rows.map((h) => (
            <div key={h.id} className="rounded-md border p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground">Changed {format(new Date(h.changed_at), "MMM d, yyyy h:mm a")} by {h.changed_by_name ?? "Unknown"}. Before that it read:</p>
              <p><span className="font-medium">{h.previous.note_type ? noteTypeLabel(h.previous.note_type as NoteType) : ""}</span> — {h.previous.title}</p>
              <p className="whitespace-pre-wrap">{h.previous.details}</p>
              {h.previous.expected_change && <p>Expected change: {h.previous.expected_change}</p>}
            </div>
          ))}
        </DialogContent>
      </Dialog>

      <Dialog open={!!ackNote} onOpenChange={(o) => !o && setAckNote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm you received this</DialogTitle><DialogDescription>Signing confirms you've read it, not that you agree. Your signature is date- and time-stamped.</DialogDescription></DialogHeader>
          <Textarea placeholder="Your comment (optional)" value={ackComment} onChange={(e) => setAckComment(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setAckNote(null)}>Cancel</Button><Button onClick={acknowledge}>Sign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
