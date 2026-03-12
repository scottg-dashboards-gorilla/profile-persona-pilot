import { DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, FileDown } from "lucide-react";
import DatapathLogo from "@/components/DatapathLogo";
import { usePDFExport } from "@/lib/pdfExport";
import OverviewTab from "./OverviewTab";
import DimensionsTab from "./DimensionsTab";
import InsightsTab from "./InsightsTab";
import ChatTab from "./ChatTab";
import CoachingChat from "./CoachingChat";
import DISCTab from "./DISCTab";

interface ResultsScreenProps {
  scores: DimensionScore[];
  discProfile: DISCProfile;
  truthfulness: TruthtfulnessResult;
  elapsedSeconds: number;
  employeeName?: string;
  onRestart: () => void;
}

const ResultsScreen = ({ scores, discProfile, truthfulness, elapsedSeconds, employeeName, onRestart }: ResultsScreenProps) => {
  const { exportPDF } = usePDFExport();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display text-foreground">
            {employeeName ? `${employeeName}'s Assessment` : "Datapath Technical Resource Assessment"}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPDF({ scores, discProfile, truthfulness, elapsedSeconds, employeeName })}
              className="gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onRestart} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
              New Assessment
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dimensions">Skills</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="chat">Q&A</TabsTrigger>
            <TabsTrigger value="coaching">AI Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab scores={scores} discProfile={discProfile} truthfulness={truthfulness} elapsedSeconds={elapsedSeconds} />
          </TabsContent>

          <TabsContent value="dimensions">
            <DimensionsTab scores={scores} />
          </TabsContent>

          <TabsContent value="disc">
            <DISCTab discProfile={discProfile} scores={scores} />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab scores={scores} truthfulness={truthfulness} />
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
