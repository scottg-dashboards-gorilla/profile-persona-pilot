import { DimensionScore } from "@/types/assessment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import OverviewTab from "./OverviewTab";
import DimensionsTab from "./DimensionsTab";
import InsightsTab from "./InsightsTab";
import ChatTab from "./ChatTab";
import CoachingChat from "./CoachingChat";

interface ResultsScreenProps {
  scores: DimensionScore[];
  elapsedSeconds: number;
  employeeName?: string;
  onRestart: () => void;
}

const ResultsScreen = ({ scores, elapsedSeconds, employeeName, onRestart }: ResultsScreenProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display text-foreground">
            {employeeName ? `${employeeName}'s Profile` : "Your Personality Profile"}
          </h1>
          <Button variant="ghost" size="sm" onClick={onRestart} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            Retake
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="chat">Follow-Up</TabsTrigger>
            <TabsTrigger value="coaching">AI Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab scores={scores} elapsedSeconds={elapsedSeconds} />
          </TabsContent>

          <TabsContent value="dimensions">
            <DimensionsTab scores={scores} />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab scores={scores} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatTab scores={scores} />
          </TabsContent>

          <TabsContent value="coaching">
            <CoachingChat scores={scores} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultsScreen;
