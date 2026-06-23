import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { calculateDISCProfile, calculateTruthfulness } from "@/lib/scoring";
import { getArchetype } from "@/lib/archetypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoachingChat from "@/components/assessment/CoachingChat";
import ResultsScreen from "@/components/assessment/ResultsScreen";
import { Users, Search, Plus, ArrowLeft, Trash2, BarChart3, GitCompareArrows, Link2, Settings } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamAnalytics from "@/components/dashboard/TeamAnalytics";
import CompareView from "@/components/dashboard/CompareView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoles, getRoleFromList } from "@/hooks/useRoles";
import { Badge } from "@/components/ui/badge";

interface EmployeeProfile {
  id: string;
  employee_name: string;
  scores: DimensionScore[];
  elapsed_seconds: number;
  created_at: string;
  disc_profile?: DISCProfile | null;
  truthfulness?: TruthtfulnessResult | null;
  role?: string | null;
}

const PUBLISHED_APP_URL = "https://profile-persona-pilot.lovable.app";

const getAssessmentShareUrl = () => {
  return new URL("/assessment", PUBLISHED_APP_URL).toString();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles: roleConfigs } = useRoles({ includeInactive: true });
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [view, setView] = useState<"list" | "profile" | "coach">("list");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("employee_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load profiles", variant: "destructive" });
    }
    setProfiles((data as unknown as EmployeeProfile[]) ?? []);
    setLoading(false);
  };

  const deleteProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("employee_profiles").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) {
      setSelected(null);
      setView("list");
    }
  };

  const filtered = profiles.filter((p) => {
    const matchesName = p.employee_name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || (p.role ?? "technical") === roleFilter;
    return matchesName && matchesRole;
  });

  const selectedDiscProfile = useMemo<DISCProfile | null>(() => {
    if (!selected) return null;
    if (selected.disc_profile) return selected.disc_profile;
    return calculateDISCProfile(selected.scores);
  }, [selected]);

  const selectedTruthfulness = useMemo<TruthtfulnessResult>(() => {
    if (selected?.truthfulness) return selected.truthfulness;
    return { score: -1, pairCount: 0, inconsistentPairs: [], label: "N/A" };
  }, [selected]);


  if (view === "profile" && selected && selectedDiscProfile) {
    return (
      <div>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1.5 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
        </div>
        <ResultsScreen
          scores={selected.scores}
          discProfile={selectedDiscProfile}
          truthfulness={selectedTruthfulness}
          elapsedSeconds={selected.elapsed_seconds}
          employeeName={selected.employee_name}
          employeeProfileId={selected.id}
          onRestart={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "coach" && selected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1.5 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
          <CoachingChat scores={selected.scores} employeeProfileId={selected.id} employeeName={selected.employee_name} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Datapath Assessments</h1>
              <p className="text-sm text-muted-foreground">{profiles.length} assessment{profiles.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/admin/roles")}
              >
                <Settings className="w-4 h-4" /> Manage Roles
              </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                const url = getAssessmentShareUrl();
                try {
                  await navigator.clipboard.writeText(url);
                  toast({ title: "Link copied!", description: "Share this public assessment link with candidates." });
                } catch (error) {
                  console.error("Clipboard copy failed:", error);
                  window.prompt("Copy this public assessment link:", url);
                  toast({ title: "Copy manually", description: "Clipboard was blocked, so we opened a manual copy prompt." });
                }
              }}
            >
              <Link2 className="w-4 h-4" /> Share Link
            </Button>
            <Button onClick={() => navigate("/assessment")} className="gap-1.5">
              <Plus className="w-4 h-4" /> New Assessment
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profiles" className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="profiles" className="flex-1 gap-1.5">
              <Users className="w-3.5 h-3.5" /> Profiles
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex-1 gap-1.5">
              <GitCompareArrows className="w-3.5 h-3.5" /> Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            <div className="mb-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleConfigs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {search ? "No matching assessments" : "No assessments yet. Start a new assessment!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((profile) => {
                  const archetype = getArchetype(profile.scores);
                  const roleLabel = getRoleFromList(roleConfigs, profile.role ?? "technical").label;
                  return (
                    <div
                      key={profile.id}
                      className="card-elevated p-4 hover-lift cursor-pointer"
                      onClick={() => { setSelected(profile); setView("profile"); }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{profile.employee_name}</h3>
                            <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {archetype.name} · {new Date(profile.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelected(profile); setView("coach"); }}
                            className="gap-1.5"
                          >
                            AI Coach
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => deleteProfile(profile.id, e)}
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <TeamAnalytics profiles={profiles} />
          </TabsContent>

          <TabsContent value="compare">
            <CompareView profiles={profiles} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;

