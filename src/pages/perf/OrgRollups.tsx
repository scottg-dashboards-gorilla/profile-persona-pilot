import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2, Network, UserRound, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

type Employee = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  title: string | null;
  manager_uuid: string | null;
  user_id: string | null;
};

type OrgNode = Employee & { children: OrgNode[] };

const fullName = (employee: Employee) => `${employee.first_name} ${employee.last_name}`.trim();

function initials(employee: Employee) {
  return `${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase();
}

function countPeople(node: OrgNode): number {
  return node.children.reduce((total, child) => total + 1 + countPeople(child), 0);
}

function countLevels(node: OrgNode): number {
  return node.children.length ? 1 + Math.max(...node.children.map(countLevels)) : 1;
}

function OrgPerson({ node, root = false }: { node: OrgNode; root?: boolean }) {
  return (
    <div className="flex min-w-max flex-col items-center">
      <Link
        to={`/people/${node.uuid}`}
        className={`group block w-52 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          root ? "border-primary/40 ring-1 ring-primary/10" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              root ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {initials(node)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold group-hover:text-primary">{fullName(node)}</div>
            <div className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
              {node.title ?? "Team member"}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span className="max-w-[120px] truncate">{node.department ?? "No department"}</span>
          {node.children.length > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Users className="h-3 w-3" /> {node.children.length}
            </span>
          )}
        </div>
      </Link>

      {node.children.length > 0 && (
        <>
          <div className="h-6 border-l" aria-hidden="true" />
          <div className="relative flex items-start justify-center gap-5 border-t pt-6">
            {node.children.map((child) => (
              <div
                key={child.uuid}
                className="relative before:absolute before:-top-6 before:left-1/2 before:h-6 before:border-l"
              >
                <OrgPerson node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgRollups() {
  const { viewMode } = usePermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [signedInEmployeeId, setSignedInEmployeeId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,department,title,manager_uuid,user_id")
        .eq("terminated", false)
        .order("first_name");

      if (!active) return;
      const rows = (data ?? []) as Employee[];
      setEmployees(rows);
      setSignedInEmployeeId(rows.find((employee) => employee.user_id === user?.id)?.uuid ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.uuid, employee])),
    [employees],
  );

  const managers = useMemo(() => {
    const managerIds = new Set(employees.map((employee) => employee.manager_uuid).filter(Boolean));
    return employees
      .filter((employee) => managerIds.has(employee.uuid))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [employees]);

  useEffect(() => {
    if (viewMode !== "admin" || selectedManagerId || managers.length === 0) return;
    const topManager = managers.find(
      (manager) => !manager.manager_uuid || !employeeById.has(manager.manager_uuid),
    );
    setSelectedManagerId((topManager ?? managers[0]).uuid);
  }, [employeeById, managers, selectedManagerId, viewMode]);

  const rootId = viewMode === "admin" ? selectedManagerId : signedInEmployeeId;

  const tree = useMemo<OrgNode | null>(() => {
    if (!rootId) return null;
    const build = (id: string, path: Set<string>): OrgNode | null => {
      const employee = employeeById.get(id);
      if (!employee || path.has(id)) return null;
      const nextPath = new Set(path).add(id);
      const children = employees
        .filter((candidate) => candidate.manager_uuid === id)
        .sort((a, b) => fullName(a).localeCompare(fullName(b)))
        .map((child) => build(child.uuid, nextPath))
        .filter((child): child is OrgNode => child !== null);
      return { ...employee, children };
    };
    return build(rootId, new Set());
  }, [employeeById, employees, rootId]);

  const summary = useMemo(() => {
    if (!tree) return { team: 0, direct: 0, levels: 0, departments: 0 };
    const departments = new Set<string>();
    const visit = (node: OrgNode) => {
      if (node.department) departments.add(node.department);
      node.children.forEach(visit);
    };
    visit(tree);
    return {
      team: countPeople(tree),
      direct: tree.children.length,
      levels: countLevels(tree),
      departments: departments.size,
    };
  }, [tree]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading your organization…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Organizational structure</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewMode === "admin"
              ? "Choose a manager to see their complete reporting structure."
              : "Your reporting structure, starting with you and the people in your team."}
          </p>
        </div>
        {viewMode === "admin" && managers.length > 0 && (
          <div className="w-full sm:w-72">
            <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
              <SelectTrigger aria-label="Choose manager">
                <SelectValue placeholder="Choose a manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.uuid} value={manager.uuid}>
                    {fullName(manager)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {tree ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "People in structure", value: summary.team, icon: Users },
              { label: "Direct reports", value: summary.direct, icon: UserRound },
              { label: "Reporting levels", value: summary.levels, icon: Network },
              { label: "Departments", value: summary.departments, icon: Building2 },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border bg-muted/20 px-8 py-10">
            <div className="flex min-w-max justify-center">
              <OrgPerson node={tree} root />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Select any person to open their staff record. The number beside a person is their direct-report count.
          </p>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Network className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 font-medium">No reporting structure found</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Your sign-in must be linked to a staff record with reporting lines.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}