import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Building2, Briefcase, CalendarDays, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

type EmployeeRow = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  title: string | null;
  manager_uuid: string | null;
  hire_date: string | null;
  payment_unit: string | null;
};

export default function MyProfile() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [me, setMe] = useState<EmployeeRow | null>(null);
  const [manager, setManager] = useState<{
    first_name: string;
    last_name: string;
    title: string | null;
    email: string | null;
    department: string | null;
  } | null>(null);
  const [reports, setReports] = useState(0);
  const [reportRows, setReportRows] = useState<EmployeeRow[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      const { data: emp } = await supabase
        .from("employees")
        .select("uuid, first_name, last_name, email, department, title, manager_uuid, hire_date, payment_unit")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) {
        setLoading(false);
        return;
      }
      const row = emp as EmployeeRow;
      setMe(row);
      if (row.manager_uuid) {
        const { data: mgr } = await supabase
          .from("employees")
          .select("first_name, last_name, title, email, department")
          .eq("uuid", row.manager_uuid)
          .maybeSingle();
        setManager(mgr ?? null);
      }
      const { data: reps } = await supabase
        .from("employees")
        .select("uuid, first_name, last_name, email, department, title, manager_uuid, hire_date, payment_unit")
        .eq("manager_uuid", row.uuid)
        .eq("terminated", false)
        .order("first_name");
      setReportRows((reps as EmployeeRow[]) ?? []);
      setReports(reps?.length ?? 0);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading your profile…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="font-medium">Sign in to see your profile</div>
          <Button asChild className="mt-4">
            <Link to="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Your sign-in isn't linked to a staff record yet. Reload the page — it links automatically
          once your work email is on file.
        </CardContent>
      </Card>
    );
  }

  const fields: {
    icon: typeof Briefcase;
    label: string;
    value: string;
    sub?: string;
  }[] = [
    {
      icon: Users,
      label: "Line manager / Supervisor",
      value: manager ? `${manager.first_name} ${manager.last_name}` : "—",
      sub: manager?.title ?? undefined,
    },
    { icon: Briefcase, label: "Job title", value: me.title ?? "—" },
    { icon: Building2, label: "Department", value: me.department ?? "—" },
    { icon: Mail, label: "Work email", value: me.email ?? "—" },
    {
      icon: CalendarDays,
      label: "Hire date",
      value: me.hire_date ? format(parseISO(me.hire_date), "MMMM d, yyyy") : "—",
    },
    {
      icon: Users,
      label: "Direct reports",
      value: reports > 0 ? `${reports} ${reports === 1 ? "person" : "people"}` : "—",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {me.first_name} {me.last_name}
          </CardTitle>
          <CardDescription>{me.title ?? "Team member"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <f.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </div>
                <div className="text-sm font-medium">{f.value}</div>
                {f.sub && (
                  <div className="text-xs text-muted-foreground">{f.sub}</div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Something wrong with these details? Let HR know and they'll update your record.
      </p>
    </div>
  );
}
