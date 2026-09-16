import { useNavigate } from "react-router-dom";
import { Check, Eye } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { viewModeHints, viewModeLabels, type ViewMode } from "@/hooks/useViewMode";

/** Lets managers and admins move between the employee, manager and admin views. */
export function ViewModeMenuSection() {
  const { availableModes, viewMode, setViewMode, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading || availableModes.length < 2) return null;

  const pick = (mode: ViewMode) => {
    setViewMode(mode);
    navigate(mode === "employee" ? "/me" : "/");
  };

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        Switch view
      </DropdownMenuLabel>
      {availableModes.map((mode) => (
        <DropdownMenuItem
          key={mode}
          onClick={() => pick(mode)}
          className="flex items-start gap-2 cursor-pointer"
        >
          <span className="w-4 shrink-0 pt-0.5">
            {viewMode === mode && <Check className="h-4 w-4" />}
          </span>
          <span className="space-y-0.5">
            <span className="block text-sm">{viewModeLabels[mode]}</span>
            <span className="block text-xs text-muted-foreground">{viewModeHints[mode]}</span>
          </span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

/** Small header badge so it is always obvious which view is active. */
export function ViewModeBadge() {
  const { availableModes, viewMode, loading } = usePermissions();
  if (loading || availableModes.length < 2) return null;
  return (
    <Badge variant="secondary" className="hidden sm:flex items-center gap-1 font-normal">
      <Eye className="h-3 w-3" /> {viewModeLabels[viewMode]}
    </Badge>
  );
}
