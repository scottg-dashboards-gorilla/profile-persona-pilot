import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AdminRoles from "./pages/AdminRoles";
import AdminAccess from "./pages/AdminAccess";
import PerfLayout from "./components/perf/PerfLayout";
import Overview from "./pages/perf/Overview";
import Reviews from "./pages/perf/Reviews";
import People from "./pages/perf/People";
import EmployeeDetail from "./pages/perf/EmployeeDetail";
import Cycles from "./pages/perf/Cycles";
import Goals from "./pages/perf/Goals";
import Compensation from "./pages/perf/Compensation";
import Calibration from "./pages/perf/Calibration";
import OrgRollups from "./pages/perf/OrgRollups";
import AuditLog from "./pages/perf/AuditLog";
import MyReview from "./pages/perf/MyReview";
import Playbook from "./pages/perf/Playbook";
import ReviewForm from "./pages/ReviewForm";
import RequireArea from "./components/perf/RequireArea";


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
            <Route path="/reviews" element={<RequireArea area="reviews"><Reviews /></RequireArea>} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:uuid" element={<EmployeeDetail />} />
            <Route path="/me" element={<MyReview />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/cycles" element={<RequireArea area="cycles"><Cycles /></RequireArea>} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/compensation" element={<RequireArea area="compensation"><Compensation /></RequireArea>} />
            <Route path="/calibration" element={<RequireArea area="calibration"><Calibration /></RequireArea>} />
            <Route path="/org" element={<RequireArea area="org"><OrgRollups /></RequireArea>} />
            <Route path="/admin/audit" element={<RequireArea area="audit"><AuditLog /></RequireArea>} />

            <Route path="/assessments" element={<Dashboard />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/access" element={<AdminAccess />} />
          </Route>

          {/* Candidate-facing assessment (no shell) */}
          <Route path="/assessment" element={<Index />} />

          {/* Sign in / sign up (no shell) */}
          <Route path="/login" element={<Login />} />

          {/* Private self-assessment & 360 feedback forms — no account needed */}
          <Route path="/review-form/:token" element={<ReviewForm />} />


          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
