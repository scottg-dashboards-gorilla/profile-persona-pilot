import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { dimensions } from "@/data/dimensions";
import { questions } from "@/data/questions";
import { StoredRoleConfig } from "@/hooks/useRoles";

interface RoleEditorProps {
  open: boolean;
  onClose: () => void;
  initial: StoredRoleConfig | null;
  existingIds: string[];
  onSave: (role: StoredRoleConfig) => Promise<void> | void;
}

const CATEGORY_LABELS: Record<string, string> = {
  competency: "Competency",
  comptia: "CompTIA Technical",
  disc: "DISC Behavioral",
  coaching: "Coaching & Self-Assessment",
};

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const blank: StoredRoleConfig = {
  id: "",
  label: "",
  description: "",
  dimensions: [],
  includesTechnical: false,
  sort_order: 100,
  is_active: true,
};

const RoleEditor = ({ open, onClose, initial, existingIds, onSave }: RoleEditorProps) => {
  const [draft, setDraft] = useState<StoredRoleConfig>(initial ?? blank);
  const [saving, setSaving] = useState(false);
  const isNew = !initial;

  useEffect(() => {
    setDraft(initial ?? blank);
  }, [initial, open]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof dimensions>();
    for (const d of dimensions) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return map;
  }, []);

  const questionCount = useMemo(() => {
    const set = new Set(draft.dimensions);
    return questions.filter((q) => set.has(q.dimensionId)).length;
  }, [draft.dimensions]);

  const estMinutes = Math.max(3, Math.round(questionCount * 0.2));

  const idCollision =
    isNew && draft.id && existingIds.includes(draft.id);

  const canSave =
    draft.label.trim().length > 0 &&
    draft.id.trim().length > 0 &&
    !idCollision &&
    draft.dimensions.length > 0;

  const toggleDim = (dimId: string, checked: boolean) => {
    setDraft((d) => ({
      ...d,
      dimensions: checked
        ? [...d.dimensions, dimId]
        : d.dimensions.filter((x) => x !== dimId),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "New role" : `Edit: ${initial?.label}`}</DialogTitle>
          <DialogDescription>
            Choose which dimensions this role is assessed on. Candidates will only see questions tied to the selected dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="role-label">Label</Label>
              <Input
                id="role-label"
                value={draft.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    label,
                    id: isNew ? slugify(label) : d.id,
                  }));
                }}
                placeholder="e.g. Customer Success"
              />
            </div>
            <div>
              <Label htmlFor="role-id">ID (slug)</Label>
              <Input
                id="role-id"
                value={draft.id}
                disabled={!isNew}
                onChange={(e) => setDraft((d) => ({ ...d, id: slugify(e.target.value) }))}
              />
              {idCollision && (
                <p className="text-xs text-destructive mt-1">A role with this ID already exists.</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="role-desc">Description</Label>
            <Textarea
              id="role-desc"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Short helper text shown under the role dropdown"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="role-order">Sort order</Label>
              <Input
                id="role-order"
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: parseInt(e.target.value || "0", 10) }))}
              />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="role-tech"
                  checked={draft.includesTechnical}
                  onCheckedChange={(checked) => setDraft((d) => ({ ...d, includesTechnical: checked }))}
                />
                <Label htmlFor="role-tech" className="cursor-pointer">Counts as technical role</Label>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Technical roles get a tier classification (Tier 1, Tier 2, Team Leader). Non-technical roles get a behavioral-only summary.
          </p>

          <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
            <strong>{questionCount} questions</strong> — about {estMinutes} minute{estMinutes === 1 ? "" : "s"}.
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold">Included dimensions</Label>
            {Array.from(grouped.entries()).map(([cat, dims]) => (
              <div key={cat} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const ids = dims.map((d) => d.id);
                        setDraft((d) => ({
                          ...d,
                          dimensions: Array.from(new Set([...d.dimensions, ...ids])),
                        }));
                      }}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const ids = new Set(dims.map((d) => d.id));
                        setDraft((d) => ({
                          ...d,
                          dimensions: d.dimensions.filter((x) => !ids.has(x)),
                        }));
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dims.map((dim) => {
                    const checked = draft.dimensions.includes(dim.id);
                    return (
                      <label
                        key={dim.id}
                        className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleDim(dim.id, !!c)}
                          className="mt-0.5"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dim.color }}
                          />
                          <span className="truncate">{dim.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Saving..." : "Save role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleEditor;