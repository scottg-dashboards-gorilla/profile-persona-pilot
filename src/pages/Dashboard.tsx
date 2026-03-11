import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DimensionScore } from "@/types/assessment";
import { getArchetype } from "@/lib/archetypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoachingChat from "@/components/assessment/CoachingChat";
import ResultsScreen from "@/components/assessment/ResultsScreen";
import { Users, Search, Plus, ArrowLeft, Trash2, BarChart3, GitCompareArrows, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamAnalytics from "@/components/dashboard/TeamAnalytics";
import CompareView from "@/components/dashboard/CompareView";

interface EmployeeProfile {
  id: string;
  employee_name: string;
  scores: DimensionScore[];
  elapsed_seconds: number;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [view, setView] = useState<"list" | "profile" | "coach">("list");

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

  const filtered = profiles.filter((p) =>
    p.employee_name.toLowerCase().includes(search.toLowerCase())
  );

  if (view === "profile" && selected) {
    return (
      <div>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1.5 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
        </div>
        <ResultsScreen
          scores={selected.scores}
          elapsedSeconds={selected.elapsed_seconds}
          employeeName={selected.employee_name}
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
          <CoachingChat scores={selected.scores} />
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
              <h1 className="text-2xl font-bold font-display text-foreground">Team Leader Assessments</h1>
              <p className="text-sm text-muted-foreground">{profiles.length} assessment{profiles.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const url = `${window.location.origin}/assessment`;
                navigator.clipboard.writeText(url);
                toast({ title: "Link copied!", description: "Share this link for someone to take the assessment." });
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
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
                  return (
                    <div
                      key={profile.id}
                      className="card-elevated p-4 hover-lift cursor-pointer"
                      onClick={() => { setSelected(profile); setView("profile"); }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{profile.employee_name}</h3>
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
