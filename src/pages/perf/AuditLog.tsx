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
import { RefreshCw, History } from "lucide-react";

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

function fmt(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setEntries((data ?? []) as unknown as Entry[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (tableFilter !== "all" && e.table_name !== tableFilter) return false;
      if (!q) return true;
      return (
        (e.actor_email ?? "").toLowerCase().includes(q) ||
        (e.summary ?? "").toLowerCase().includes(q) ||
        Object.keys(e.changed_fields ?? {}).join(" ").toLowerCase().includes(q)
      );
    });
  }, [entries, tableFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
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
        <div className="w-72">
          <Label className="text-xs">Search</Label>
          <Input
            className="h-9"
            placeholder="Person, email, or field name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

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
                    No audit entries yet. Every change to reviews, cycles, reviewer feedback, and
                    access roles from now on is recorded here automatically.
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
