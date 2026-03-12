import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

export interface ManagerNote {
  id: string;
  employee_profile_id: string;
  note_type: string;
  content: string;
  outcome: string | null;
  created_at: string;
}

interface ManagerNotesProps {
  employeeProfileId: string;
  onNotesChanged?: (notes: ManagerNote[]) => void;
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  feedback_given: "Feedback Given",
  coaching_session: "Coaching Session",
  general: "General Note",
};

const ManagerNotes = ({ employeeProfileId, onNotesChanged }: ManagerNotesProps) => {
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState("observation");
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("manager_notes")
      .select("*")
      .eq("employee_profile_id", employeeProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load notes:", error);
      return;
    }
    const typedNotes = (data || []) as ManagerNote[];
    setNotes(typedNotes);
    onNotesChanged?.(typedNotes);
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, [employeeProfileId]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("manager_notes").insert({
      employee_profile_id: employeeProfileId,
      note_type: noteType,
      content: content.trim(),
      outcome: outcome.trim() || null,
    } as any);

    if (error) {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
      setSaving(false);
      return;
    }

    setContent("");
    setOutcome("");
    setShowForm(false);
    setSaving(false);
    toast({ title: "Note saved", description: "The AI Coach will now factor this in." });
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("manager_notes").delete().eq("id", id);
    loadNotes();
  };

  return (
    <div className="border border-border rounded-lg bg-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">
            Manager Notes {notes.length > 0 && `(${notes.length})`}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Log interactions, coaching sessions, and observations. The AI Coach uses these to give better advice.
          </p>

          {/* Add note button / form */}
          {!showForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5 w-full">
              <Plus className="w-3.5 h-3.5" /> Add Note
            </Button>
          ) : (
            <div className="space-y-2 p-3 bg-muted/30 rounded-md border border-border">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What happened? What did you observe or discuss?"
                className="text-sm min-h-[60px]"
              />

              <Textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="(Optional) How did they respond? What was the outcome?"
                className="text-sm min-h-[40px]"
              />

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!content.trim() || saving} className="flex-1">
                  {saving ? "Saving..." : "Save Note"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setContent(""); setOutcome(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing notes */}
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No notes yet. Add your first observation to enhance AI coaching.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="p-2.5 bg-muted/20 rounded-md border border-border/50 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-accent">
                          {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(note.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground">{note.content}</p>
                      {note.outcome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Outcome:</span> {note.outcome}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerNotes;
