import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { viewModeLabels } from "@/hooks/useViewMode";

type StepDef = { title: string; body: string };

/** What each button is, keyed by its data-tour marker. Only buttons visible to the person are toured. */
const STEP_TEXT: Record<string, StepDef> = {
  welcome: {
    title: "Welcome to Datapath Performance",
    body: "This quick tour shows what each button in the menu does and where to find things. You can skip it now and restart it any time from your account menu (your initials, top right).",
  },
  "/": { title: "Home", body: "Start here. Your next action is shown first, followed by the full cycle and links to each kind of work." },
  "/cycle": { title: "Review cycle", body: "See the active cycle dates and progress, then open the exact goal, feedback, score, approval, release, or acknowledgement action." },
  "/pdr": { title: "Objectives", body: "Set and agree annual goals, then record mid-year and year-end progress. These are separate from day-to-day tasks." },
  "/apr": { title: "Pay review", body: "Managers enter ratings, I/C scores and merit recommendations here. HR approves them before anything is shared." },
  "/reviews": { title: "Feedback & reviews", body: "Employee and manager feedback lives here: accomplishments, challenges, core values, and the review conversation. Pay stays in Pay review." },
  "/people": { title: "Team assessments", body: "Review your direct reports' technical results, DISC styles, and changes since their previous assessment." },
  "/improvement": { title: "Improvement actions", body: "Follow-up actions created when an assessment flags a weak or dropping skill. Track status and overdue items here; mandatory ones must be done before a review can be completed." },
  "/tasks": { title: "Tasks", body: "Day-to-day work lives here. Move tasks between columns as work progresses; annual objectives stay in Objectives." },
  "/me": { title: "My feedback", body: "Write your review input here and, once released, read your manager's feedback and approved outcome." },
  "/company": { title: "Company performance", body: "Company scorecard and KPIs that size the annual pay pool." },
  "/compensation": { title: "Salary updates", body: "See approved salary changes after HR has signed them off. Unapproved recommendations do not appear here." },
  "/salary-history": { title: "Salary history", body: "Restricted record of past pay changes. Confidential — visible to authorised people only." },
  "/calibration": { title: "Calibration", body: "Compare how different reviewers rate, to spot ratings that are too tough or too generous." },
  "/org": { title: "Org structure", body: "Your reporting tree — who reports to whom. Click anyone to open their record." },
  "/playbook": { title: "Tool", body: "The guide to the cycle: key dates, your steps through the year, rating meanings and tips. Start here if you're unsure what to do next." },
  "/admin/panel": { title: "Admin panel", body: "Manage merit budgets, pay approvals, access roles, the review calendar, fairness checks, questions, and records needing attention." },
  "/assessments": { title: "Assessments", body: "All candidate and staff assessment results, with sharing links and comparisons." },
  "/admin/roles": { title: "Assessment roles", body: "Choose which technical question groups apply to each assessment role." },
  "/admin/access": { title: "Access", body: "Give people roles such as HR, manager or admin, which controls what they can see." },
  "/admin/audit": { title: "Audit log", body: "A history of who changed what and when." },
  "view-mode": { title: "Current view", body: "Shows whether you're seeing the app as an employee, manager or admin. Switch views from your account menu." },
  notifications: { title: "Notifications", body: "Reminders and things waiting on you. The number shows how many actions are pending." },
  account: { title: "Your account", body: "Your profile, view switching, sign out — and 'Take the tour' to see this guide again." },
  "sidebar-toggle": { title: "Show / hide menu", body: "Collapse the side menu to icons for more room, or expand it again." },
};

export const TOUR_EVENT = "perf-start-tour";
export const startTour = () => window.dispatchEvent(new Event(TOUR_EVENT));

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour({ userId }: { userId: string }) {
  const { viewMode, availableModes, loading } = usePermissions();
  // One tour per view (employee / manager / admin), so switching views shows that view's buttons.
  const storageKey = `perf-tour-done:${userId}:${viewMode}`;
  const [steps, setSteps] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const begin = useCallback(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>("[data-tour]"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.dataset.tour!)
      .filter((k, i, a) => STEP_TEXT[k] && a.indexOf(k) === i)
      // People with a single view never see the view switcher, so skip that step.
      .filter((k) => k !== "view-mode" || availableModes.length > 1);
    setSteps(["welcome", ...found]);
    setIndex(0);
    setOpen(true);
  }, [availableModes.length]);

  useEffect(() => {
    const h = () => begin();
    window.addEventListener(TOUR_EVENT, h);
    let t: number | undefined;
    if (!loading && !localStorage.getItem(storageKey)) t = window.setTimeout(begin, 1200);
    return () => {
      window.removeEventListener(TOUR_EVENT, h);
      if (t) clearTimeout(t);
    };
  }, [begin, storageKey, loading]);

  const key = steps[index];

  useLayoutEffect(() => {
    if (!open || !key || key === "welcome") return setRect(null);
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(key)}"]`);
      if (!el) return setRect(null);
      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, key]);

  const close = () => {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  };

  if (!open || !key) return null;
  const step = STEP_TEXT[key];
  const last = index === steps.length - 1;

  // Place the card beside the highlighted button, kept on screen.
  const cardW = 320;
  let cardStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const right = rect.left + rect.width + 12;
    const left = right + cardW < vw ? right : Math.max(12, rect.left + rect.width - cardW);
    const top = right + cardW < vw ? rect.top : rect.top + rect.height + 12;
    cardStyle = { left, top: Math.min(Math.max(12, top), vh - 240) };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {rect ? (
        <div
          className="fixed rounded-lg ring-2 ring-primary transition-all duration-200 pointer-events-none"
          style={{ ...rect, boxShadow: "0 0 0 9999px hsl(var(--foreground) / 0.55)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-foreground/55" />
      )}
      <div
        className="fixed w-[320px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-4"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-sm">{step.title}{key === "welcome" && <span className="block text-xs font-normal text-muted-foreground">{viewModeLabels[viewMode]} tour</span>}</h2>
          <button onClick={close} aria-label="Close tour" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {index + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {index === 0 ? (
              <Button size="sm" variant="ghost" onClick={close}>Skip</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIndex(index - 1)}>Back</Button>
            )}
            <Button size="sm" onClick={() => (last ? close() : setIndex(index + 1))}>
              {last ? "Finish" : index === 0 ? "Start tour" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
