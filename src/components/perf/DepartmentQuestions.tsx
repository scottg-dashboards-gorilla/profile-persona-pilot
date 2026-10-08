import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id: string;
  department: string | null;
  prompt: string;
  help_text: string | null;
  response_type: "score" | "yes_no" | "text";
  audience: "employee" | "manager" | "both";
  sort_order: number;
  is_active: boolean;
  applies_to_titles: string[];
};

const ALL = "__all__";

/**
 * HR/admin editor for the extra review questions a department wants on top of
 * the shared core-value grading (participation, timesheet entry, and so on).
 */
export default function DepartmentQuestions() {
  const [rows, setRows] = useState<Question[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    department: ALL,
    prompt: "",
    help_text: "",
    response_type: "score" as Question["response_type"],
    audience: "both" as Question["audience"],
    applies_to_titles: "",
  });

  const load = useCallback(async () => {
    const [{ data: qs }, { data: emps }] = await Promise.all([
      supabase
        .from("department_questions")
        .select("id, department, prompt, help_text, response_type, audience, sort_order, is_active, applies_to_titles")
        .order("department", { nullsFirst: true })
        .order("sort_order"),
      supabase.from("employees").select("department").eq("terminated", false),
    ]);
    setRows((qs ?? []) as Question[]);
    const deps = Array.from(
      new Set(((emps ?? []) as { department: string | null }[]).map((e) => e.department).filter(Boolean)),
    ) as string[];
    setDepartments(deps.sort());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!draft.prompt.trim()) {
      toast.error("Give the question some wording first.");
      return;
    }
    setSaving(true);
    const dept = draft.department === ALL ? null : draft.department;
    const nextOrder =
      Math.max(0, ...rows.filter((r) => r.department === dept).map((r) => r.sort_order)) + 1;
    const { error } = await supabase.from("department_questions").insert({
      department: dept,
      prompt: draft.prompt.trim(),
      help_text: draft.help_text.trim() || null,
      response_type: draft.response_type,
      audience: draft.audience,
      sort_order: nextOrder,
      applies_to_titles: draft.applies_to_titles.split(";").map((t) => t.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft({ ...draft, prompt: "", help_text: "" });
    toast.success("Question added");
    load();
  }

  async function toggle(q: Question) {
    const { error } = await supabase
      .from("department_questions")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    if (error) return toast.error(error.message);
    setRows((p) => p.map((r) => (r.id === q.id ? { ...r, is_active: !r.is_active } : r)));
  }

  async function remove(q: Question) {
    const { error } = await supabase.from("department_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== q.id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Review questions by department
        </CardTitle>
        <CardDescription>
          Everyone is graded on the five DP INC core values. Add extra questions here for a single
          department — or for everyone — and they appear in both the employee's own input and the
          manager's feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Applies to</Label>
            <Select value={draft.department} onValueChange={(v) => setDraft({ ...draft, department: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Answer type</Label>
            <Select
              value={draft.response_type}
              onValueChange={(v) => setDraft({ ...draft, response_type: v as Question["response_type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score 1–5</SelectItem>
                <SelectItem value="yes_no">Yes / Mostly / No</SelectItem>
                <SelectItem value="text">Written answer only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Question</Label>
            <Input
              placeholder="e.g. Timesheet entry accuracy and timeliness"
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Guidance (optional)</Label>
            <Input
              placeholder="What good looks like"
              value={draft.help_text}
              onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Who answers it</Label>
            <Select
              value={draft.audience}
              onValueChange={(v) => setDraft({ ...draft, audience: v as Question["audience"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Employee and manager</SelectItem>
                <SelectItem value="employee">Employee only</SelectItem>
                <SelectItem value="manager">Manager only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end md:col-span-2">
            <Button onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add question
            </Button>
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Job titles (optional, separated by semicolons)</Label>
            <Input value={draft.applies_to_titles} onChange={(e) => setDraft({ ...draft, applies_to_titles: e.target.value })} placeholder="All roles when blank" />
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No extra questions yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{q.prompt}</div>
                  {q.help_text && <div className="text-xs text-muted-foreground">{q.help_text}</div>}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {q.department ?? "Everyone"}
                    </Badge>
                    {q.applies_to_titles?.length > 0 && <span className="text-xs text-muted-foreground">Roles: {q.applies_to_titles.join(", ")}</span>}
                    <Badge variant="outline" className="text-[10px]">
                      {q.response_type === "score"
                        ? "Score 1–5"
                        : q.response_type === "yes_no"
                          ? "Yes / Mostly / No"
                          : "Written"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {q.audience === "both"
                        ? "Employee + manager"
                        : q.audience === "employee"
                          ? "Employee only"
                          : "Manager only"}
                    </Badge>
                    {!q.is_active && (
                      <Badge variant="destructive" className="text-[10px]">
                        Off
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => toggle(q)}>
                    {q.is_active ? "Turn off" : "Turn on"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
