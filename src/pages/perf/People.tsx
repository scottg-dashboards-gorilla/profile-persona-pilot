import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type EmpRow = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
};

export default function People() {
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,title,department")
        .eq("terminated", false)
        .order("first_name", { ascending: true });
      setRows((data ?? []) as EmpRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.email ?? ""} ${r.title ?? ""} ${r.department ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, title, or department"
          className="pl-8 h-9"
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No employees match.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((e) => (
                <TableRow key={e.uuid}>
                  <TableCell className="font-medium">
                    {e.first_name} {e.last_name}
                    <div className="text-xs text-muted-foreground">{e.email}</div>
                  </TableCell>
                  <TableCell>{e.title ?? "—"}</TableCell>
                  <TableCell>{e.department ?? "—"}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link to={`/people/${e.uuid}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}