## Goal
Make the assessment a required part of every review cycle and surface change-over-time for DISC, tier, and technical competencies on the employee detail page, the Complete Review modal, and the Overview dashboard.

## Database
New table `assessment_attempts` (one row per attempt):
- `employee_uuid` → employees
- `review_id` (nullable) → performance_reviews — links the attempt to the cycle review it was taken for
- `cycle_id` (nullable) → review_cycles — for fast filtering
- `taken_at`, `submitted_at`
- `disc_scores` jsonb `{ D, I, S, C }` (percentages)
- `disc_primary` text
- `tier` text (`tier_1` | `tier_2` | `team_leader`)
- `technical_scores` jsonb (per-competency 0–100)
- `truthfulness_score` numeric (kept for context, not shown as a "growth" delta)
- `raw_answers` jsonb (optional, audit only)
- Standard timestamps + RLS: admin/HR/manager-of-reviewee/self can read; admin/HR/self insert.

`performance_reviews` gets a new nullable `assessment_attempt_id` so each review points at the attempt used during completion. The Complete Review modal blocks submission until an attempt exists for that review.

Backfill: any existing `employee_profiles` row is copied into `assessment_attempts` as a single historical attempt (no `review_id`).

## Assessment flow changes
- The candidate-facing `/assessment` route accepts `?review=<reviewId>` (and falls back to employee email). On submit it writes a new `assessment_attempts` row stamped with `review_id` + `cycle_id`.
- From the Reviews page, each row gets a "Request assessment" action that copies an assessment link prefilled with `review=<id>`.
- The Complete Review modal shows the linked attempt (or a warning + copy-link button if none exists) and refuses to mark complete without one. The modal also displays deltas vs the employee's previous attempt.

## Growth tracking surfaces
1. **Employee detail page** (new `/people/:uuid`)
   - Header with current tier, primary DISC, last assessed date.
   - "Growth over time" section: line chart for DISC D/I/S/C across attempts, radar overlay of latest vs previous technical scores, tier-change timeline.
   - Table of attempts with date, cycle, tier, delta chips.

2. **Complete Review modal**
   - New "Assessment delta" card under contributor feedback: previous → current tier, DISC shifts (chips like `D +6`, `S -3`), top 3 most-improved and most-declined competencies.

3. **Overview dashboard**
   - Tiles: "Avg tier shift this cycle", "Biggest improvers" (top 3 by composite delta), "Needs attention" (negative deltas).
   - Uses the latest attempt per employee in the active cycle vs their prior attempt.

## Technical details
- New file `src/lib/assessmentDeltas.ts` with pure helpers: `discDelta`, `technicalDelta`, `tierChange`, `compositeImprovement`. Reused across all three surfaces.
- Charts via existing `recharts` dependency (LineChart for DISC, RadarChart for technical, simple list/badges for tier).
- `mockEmployees` stays for fallback display only; real data is queried from `assessment_attempts` keyed by `employee_uuid`.
- Migration runs in one file: create table → GRANTs (`authenticated` rw, `service_role` all) → enable RLS → policies using `has_role` + `is_review_manager` + self-check via `employees.user_id` → backfill from `employee_profiles` → add `assessment_attempt_id` FK on `performance_reviews`.
- Reviews list shows an "Assessment" status pill per row (Pending / Submitted) sourced from the linked attempt.

## Out of scope (call out explicitly)
- No changes to truthfulness scoring or to the assessment question set.
- No automated assessment scheduling/email; HR copies/sends the link manually for now.
- Org-wide trend tiles use only the current and previous cycle; full historical org dashboards can come later.
