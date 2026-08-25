import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { RefreshCw, History, Download } from "lucide-react";

type Entry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  changed_fields: Record<string, { from: unknown; to: unknown }> | null;
  summary: string | null;
  created_at: string;
};

const tableLabels: Record<string, string> = {
  performance_reviews: "Review",
  review_cycles: "Cycle",
  review_contributors: "Reviewer feedback",
  user_roles: "Access role",
};

const actionTone: Record<string, string> = {
  insert: "bg-emerald-100 text-emerald-800 border-emerald-200",
  update: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delete: "bg-red-100 text-red-800 border-red-200",
};

function raw(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function fmt(v: unknown) {
  const s = raw(v);
  if (!s) return "—";
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tableFilter, setTableFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [recordId, setRecordId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    setEntries((data ?? []) as unknown as Entry[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const actors = useMemo(
    () =>
      [...new Set(entries.map((e) => e.actor_email).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [entries],
  );

  const fields = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => Object.keys(e.changed_fields ?? {}).forEach((k) => set.add(k)));
    return [...set].sort();
  }, [entries]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rid = recordId.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return entries.filter((e) => {
      if (tableFilter !== "all" && e.table_name !== tableFilter) return false;
      if (actorFilter !== "all" && e.actor_email !== actorFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (fieldFilter !== "all" && !(fieldFilter in (e.changed_fields ?? {}))) return false;
      if (rid && !(e.record_id ?? "").toLowerCase().includes(rid)) return false;
      const ts = new Date(e.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      if (!q) return true;
      const haystack = [
        e.actor_email ?? "",
        e.summary ?? "",
        e.record_id ?? "",
        e.table_name,
        e.action,
        ...Object.entries(e.changed_fields ?? {}).flatMap(([k, v]) => [
          k,
          raw(v?.from),
          raw(v?.to),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, tableFilter, actorFilter, actionFilter, fieldFilter, recordId, from, to, search]);

  function exportCsv() {
    if (!rows.length) {
      toast.error("Nothing to export with the current filters.");
      return;
    }
    const header = ["When", "Who", "Area", "Action", "Record ID", "Summary", "Field", "From", "To"];
    const lines: string[] = [header.map(csvCell).join(",")];
    rows.forEach((e) => {
      const base = [
        format(parseISO(e.created_at), "yyyy-MM-dd HH:mm:ss"),
        e.actor_email ?? (e.actor_id ? "Signed-in user" : "System"),
        tableLabels[e.table_name] ?? e.table_name,
        e.action,
        e.record_id ?? "",
        e.summary ?? "",
      ];
      const changes = Object.entries(e.changed_fields ?? {});
      if (!changes.length) {
        lines.push([...base, "", "", ""].map(csvCell).join(","));
      } else {
        changes.forEach(([field, v]) =>
          lines.push([...base, field, raw(v?.from), raw(v?.to)].map(csvCell).join(",")),
        );
      }
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} entries.`);
  }

  const filtersActive =
    tableFilter !== "all" ||
    actorFilter !== "all" ||
    actionFilter !== "all" ||
    fieldFilter !== "all" ||
    !!recordId ||
    !!from ||
    !!to ||
    !!search;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label className="text-xs">Area</Label>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everything</SelectItem>
              {Object.entries(tableLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Label className="text-xs">Changed by</Label>
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="insert">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label className="text-xs">Field changed</Label>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any field</SelectItem>
              {fields.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-60">
          <Label className="text-xs">Review / cycle ID</Label>
          <Input
            className="h-9"
            placeholder="Paste a review or cycle ID"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-9"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="w-64">
          <Label className="text-xs">Search everything</Label>
          <Input
            className="h-9"
            placeholder="Person, field, or changed value"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-end gap-2">
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTableFilter("all");
                setActorFilter("all");
                setActionFilter("all");
                setFieldFilter("all");
                setRecordId("");
                setFrom("");
                setTo("");
                setSearch("");
              }}
            >
              Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {entries.length} recorded changes.
      </p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">When</TableHead>
                <TableHead className="w-56">Who</TableHead>
                <TableHead className="w-40">What</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Loading audit history…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    <History className="h-5 w-5 mx-auto mb-2" />
                    {entries.length
                      ? "No entries match these filters."
                      : "No audit entries yet. Every change to reviews, cycles, reviewer feedback, and access roles from now on is recorded here automatically."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground align-top">
                    {format(parseISO(e.created_at), "d MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm align-top">
                    {e.actor_email ?? (e.actor_id ? "Signed-in user" : "System")}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className={actionTone[e.action]}>
                      {e.action}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tableLabels[e.table_name] ?? e.table_name}
                      {e.summary ? ` · ${e.summary}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs align-top">
                    {Object.keys(e.changed_fields ?? {}).length === 0 ? (
                      <span className="text-muted-foreground">Record {e.action}d</span>
                    ) : (
                      <div className="space-y-0.5">
                        {Object.entries(e.changed_fields ?? {}).map(([field, v]) => (
                          <div key={field}>
                            <span className="font-medium">{field}</span>:{" "}
                            <span className="text-muted-foreground">{fmt(v.from)}</span> →{" "}
                            <span>{fmt(v.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Entries are written by the database itself, so they can't be edited or deleted from the app.
        Only HR and admin users can read this log.
      </p>
    </div>
  );
}
