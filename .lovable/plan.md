
# Admin: Manage Roles & Question Sets

Add a `/admin/roles` page where you can create, edit, and delete the roles candidates pick on the intro screen, including which dimensions each role is tested on and whether it counts as "technical" (affects tier classification).

## 1. Database

New table `role_configs`:

| column | type | notes |
|---|---|---|
| id | text PK | stable slug like `sales`, `technical` |
| label | text | shown in dropdown |
| description | text | helper text under the dropdown |
| dimension_ids | jsonb (text[]) | dimensions included for this role |
| includes_technical | bool | whether to compute a technical tier |
| sort_order | int | ordering in dropdowns |
| is_active | bool default true | hide instead of delete |
| created_at / updated_at | timestamptz | |

Seeded with the 8 current roles so behavior doesn't change until you edit something. Public read (the intro screen needs it); writes also public for now since the app has no auth yet — flagged as a follow-up.

## 2. Roles become DB-driven

`src/data/roles.ts` keeps the existing list as the **default fallback** so the app still works offline and during the first paint. A new `useRoles()` hook fetches `role_configs` and returns the merged list (DB rows replace defaults by id; DB-only rows are appended). `IntroScreen` and `Dashboard` use the hook; `useAssessment` accepts the resolved role config when the user begins.

## 3. Admin UI

New route `/admin/roles` (linked from a small "Manage Roles" button on the dashboard header).

Layout:

```text
+--------------------------------------------------------------+
| Manage Roles                              [+ New Role]       |
+--------------------------------------------------------------+
| Technical / Engineer / IT      [Technical] 47 dims  [Edit][x]|
| Sales                                       8 dims  [Edit][x]|
| ...                                                          |
+--------------------------------------------------------------+
```

Editor (drawer/dialog) shows:
- Label, description, sort order
- "Counts as technical role" toggle (drives tier classification)
- Dimensions grouped by category (Competency, CompTIA Technical, DISC, Coaching, Self-assessment) with checkboxes
- Live preview: "This role will see N questions (~M minutes)"
- Save / Cancel

Deleting a role soft-deletes (`is_active=false`) so historic assessments still resolve the label.

## 4. Tier classifier

`classifyTier` already checks whether any technical dim was answered. Update it to also honor `includes_technical=false` so a custom non-technical role that happens to include `problem-solving` still gets the behavioral summary instead of a technical tier.

## Technical details

- Files added: `supabase` migration, `src/hooks/useRoles.ts`, `src/pages/AdminRoles.tsx`, `src/components/admin/RoleEditor.tsx`.
- Files edited: `src/data/roles.ts` (export defaults + types only), `src/components/assessment/IntroScreen.tsx`, `src/pages/Index.tsx`, `src/pages/Dashboard.tsx`, `src/App.tsx` (add `/admin/roles` route), `src/lib/tierClassification.ts` (accept optional `includesTechnical` flag).
- React Query is already in the app — use it to cache `role_configs`.
- Seeding runs in the same migration via `INSERT … ON CONFLICT DO NOTHING` so re-runs are safe.

## Out of scope (ask if you want it)

- Auth-gating `/admin/roles`. Right now the whole app is public per the project's access-control design; locking just the admin route needs an auth layer.
- Per-role custom questions (still using the existing question pool).
- Reordering via drag-and-drop (numeric `sort_order` field for now).
