
# Role-Based Assessment Tracks

Let candidates pick a role at the start of the assessment so non-technical staff (Sales, Marketing, Finance, HR, Ops) skip the technical questions, while technical staff still get the full battery.

## 1. Define role tracks

Add a `roles` config that maps each role to the dimensions it should be assessed on. All roles include DISC, Coaching Preferences, Self-Assessment, Culture & Communication, Adaptability, Leadership, Problem Solving, and the truthfulness pairs tied to those dimensions.

| Role | Includes technical dimensions? |
|---|---|
| Technical / Engineer / IT Lead | Yes — full 93 questions (current behavior) |
| Team Leader (non-technical) | No technical dimensions, keeps leadership + DISC |
| Sales | DISC + Culture + Adaptability + Coaching + Self-Assessment |
| Marketing | Same as Sales |
| Finance / Accounting | DISC + Culture + Problem Solving + Coaching + Self-Assessment |
| HR / People Ops | DISC + Culture + Leadership + Coaching + Self-Assessment |
| Operations / Admin | DISC + Culture + Adaptability + Coaching + Self-Assessment |
| Custom / Other | DISC + Coaching only (shortest) |

Technical dimensions excluded for non-technical roles: `azure-cloud`, `m365-admin`, `security-compliance`, `network-infrastructure`, `comptia-fundamentals`, `comptia-data`, `comptia-cyberops`.

## 2. Intro screen changes

`IntroScreen.tsx` gets a required **"Select your role"** dropdown next to the name field. The estimated time and question count update live based on the chosen role (e.g. "About 6 minutes — 32 questions" for Sales vs. "About 18 minutes — 93 questions" for Technical).

## 3. Question filtering

In `useAssessment.ts`, filter `questions` by the selected role's dimension whitelist before they're presented. Truthfulness pairs are only included when both questions in the pair survive the filter. The role is persisted in `localStorage` alongside the existing resume state so refreshes restore the right track.

## 4. Scoring & results

- `scoring.ts` already iterates over whatever answers exist, so unscored dimensions simply won't appear.
- The Overview radar chart, Dimensions tab, and PDF export render only the dimensions the candidate actually answered.
- Tier classification only runs for roles that include the technical dimensions; other roles show a "Behavioral profile" summary instead of a tier.

## 5. Dashboard

`employee_profiles` gets a new `role` column (text, nullable for backward compatibility). The dashboard list, compare view, and team analytics gain a role filter so you can compare like-for-like (e.g. all Sales people together).

## Technical details

- New file: `src/data/roles.ts` exporting `RoleId`, `ROLES`, and `getDimensionsForRole(roleId)`.
- New field on `AssessmentState` and on the persisted progress blob: `role: RoleId`.
- DB migration: `ALTER TABLE public.employee_profiles ADD COLUMN role text;` (no GRANT change needed — table already has the right grants).
- `ResultsScreen`, `OverviewTab`, `DimensionsTab`, `InsightsTab`, and `pdfExport.ts` read the role to decide which sections to render.
- Existing saved profiles without a role default to "Technical" so historical data renders unchanged.

## Out of scope (ask if you want it)

- Per-role custom questions (e.g. sales-specific selling style questions). Today's plan only filters the existing pool.
- Manager-assigned roles via invite link (`/assessment?role=sales`) — easy follow-up if useful.
