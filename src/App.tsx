import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AdminRoles from "./pages/AdminRoles";
import PerfLayout from "./components/perf/PerfLayout";
import Overview from "./pages/perf/Overview";
import Reviews from "./pages/perf/Reviews";
import People from "./pages/perf/People";
import Cycles from "./pages/perf/Cycles";
import Goals from "./pages/perf/Goals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Performance Reviews app shell */}
          <Route element={<PerfLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/people" element={<People />} />
            <Route path="/cycles" element={<Cycles />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/assessments" element={<Dashboard />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
          </Route>

          {/* Candidate-facing assessment (no shell) */}
          <Route path="/assessment" element={<Index />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
