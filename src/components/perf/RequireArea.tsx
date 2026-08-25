import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";
import { usePermissions, rolesForArea, areaLabels, type PermissionArea } from "@/hooks/usePermissions";

const roleLabel: Record<string, string> = { admin: "Admin", hr: "HR", manager: "Manager" };

export default function RequireArea({
  area,
  children,
}: {
  area: PermissionArea;
  children: ReactNode;
}) {
  const { loading, can, roles } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your access…
      </div>
    );
  }

  if (can(area)) return <>{children}</>;

  return (
    <Card className="max-w-xl mx-auto mt-10">
      <CardContent className="p-8 text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">{areaLabels[area]} is restricted</h2>
        <p className="text-sm text-muted-foreground">
          This area needs one of these roles:{" "}
          {rolesForArea(area)
            .map((r) => roleLabel[r])
            .join(", ")}
          .{" "}
          {roles.length > 0
            ? `You currently have: ${roles.map((r) => roleLabel[r]).join(", ")}.`
            : "You have no roles assigned yet."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/access">Manage access</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
