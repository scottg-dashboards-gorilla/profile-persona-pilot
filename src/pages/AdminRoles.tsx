import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, RotateCcw, Settings } from "lucide-react";
import { useRoles, useUpsertRole, useDeleteRole, useReactivateRole, StoredRoleConfig } from "@/hooks/useRoles";
import { questions } from "@/data/questions";
import RoleEditor from "@/components/admin/RoleEditor";
import { toast } from "@/hooks/use-toast";

function countQuestions(dimIds: string[]) {
  const set = new Set(dimIds);
  return questions.filter((q) => set.has(q.dimensionId)).length;
}

const AdminRoles = () => {
  const navigate = useNavigate();
  const { roles, isLoading } = useRoles({ includeInactive: true });
  const upsert = useUpsertRole();
  const del = useDeleteRole();
  const reactivate = useReactivateRole();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StoredRoleConfig | null>(null);

  const handleNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const handleEdit = (role: StoredRoleConfig) => {
    setEditing(role);
    setEditorOpen(true);
  };
  const handleSave = async (role: StoredRoleConfig) => {
    try {
      await upsert.mutateAsync(role);
      toast({ title: "Role saved", description: `${role.label} is now ${role.is_active ? "active" : "hidden"}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
      throw e;
    }
  };
  const handleDelete = async (role: StoredRoleConfig) => {
    if (!confirm(`Hide "${role.label}"? Past assessments using this role will still display its label.`)) return;
    try {
      await del.mutateAsync(role.id);
      toast({ title: "Role hidden", description: `${role.label} will no longer appear in the dropdown.` });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };
  const handleReactivate = async (role: StoredRoleConfig) => {
    try {
      await reactivate.mutateAsync(role.id);
      toast({ title: "Role restored", description: `${role.label} is visible again.` });
    } catch (e: any) {
      toast({ title: "Restore failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const existingIds = roles.map((r) => r.id);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-foreground">Manage Roles</h1>
                <p className="text-sm text-muted-foreground">
                  Define which roles candidates can select and which questions each role is assessed on.
                </p>
              </div>
            </div>
            <Button onClick={handleNew} className="gap-1.5">
              <Plus className="w-4 h-4" /> New Role
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => {
              const count = countQuestions(role.dimensions);
              return (
                <div
                  key={role.id}
                  className={`card-elevated p-4 ${role.is_active ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">{role.label}</h3>
                        {role.includesTechnical ? (
                          <Badge>Technical</Badge>
                        ) : (
                          <Badge variant="secondary">Non-technical</Badge>
                        )}
                        {!role.is_active && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{role.description || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {role.dimensions.length} dimension{role.dimensions.length === 1 ? "" : "s"} · {count} question{count === 1 ? "" : "s"} · id <code className="text-[10px]">{role.id}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(role)} className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      {role.is_active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          title="Hide role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReactivate(role)}
                          className="text-muted-foreground hover:text-primary h-8 w-8"
                          title="Restore role"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RoleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        existingIds={existingIds}
        onSave={handleSave}
      />
    </div>
  );
};

export default AdminRoles;