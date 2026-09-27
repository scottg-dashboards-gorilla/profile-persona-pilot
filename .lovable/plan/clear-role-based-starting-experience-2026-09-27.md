# Clear role-based starting experience

## Goal
Make it immediately clear where each person starts, what they should do next, and where tasks, objectives, feedback, assessments, improvement actions, and pay decisions live.

## What will change

### 1. Give every view a useful Home page
- Replace the current manager redirect loop with a real manager Home.
- Give employees a simple Home rather than dropping them directly into the full review page.
- Keep the existing company overview for admins, but add a clear review-cycle launcher above the reporting detail.
- Each Home will begin with one prominent **Next step** and a short list of other items requiring attention.

### 2. Organize navigation by the work people do
- **Employee:** Home; My work (Objectives, Tasks, My review); Help (Playbook).
- **Manager:** Home; Team work (Objectives, Tasks, Feedback & reviews, Assessments, Improvement actions, Pay review); People (Org structure); Help (Playbook).
- **Admin:** Home; Review cycle; People & pay; Administration; Help.
- Rename ambiguous labels in the menu so “Feedback & reviews,” “Objectives,” and “Pay review” are easier to distinguish.
- Preserve every existing permission rule and keep each person limited to the same records they can already access.

### 3. Show the full journey without overwhelming the page
- Add a compact, role-specific cycle strip showing the ordered stages and the current area.
- Use direct action labels such as **Add objectives**, **Update tasks**, **Write feedback**, **Review assessments**, **Set improvement actions**, and **Enter pay recommendation**.
- Explain the distinction at the point of choice: Tasks are day-to-day work; Objectives are annual goals; Feedback is the review conversation; Improvement actions follow assessment findings.

### 4. Make the first screen practical
- Employee Home: next personal action, annual cycle stages, and quick access to objectives, tasks, and review input.
- Manager Home: team actions first, then the ordered manager flow from objectives through HR-approved outcome sharing.
- Admin Home: approvals and exceptions first, then cycle setup, review monitoring, assessment coverage, pay approval, and release.
- Reuse existing live counts and links where available; no new review rules or backend changes.

### 5. Verify all three views
- Check employee, manager, and admin navigation at desktop and mobile widths.
- Confirm every action opens the correct existing page, labels fit, and no view exposes another role’s options.
- Confirm the guided tour follows the reorganized navigation.

## Technical details
- Add a focused role-aware Home page and small reusable workflow/quick-action components.
- Update route handling so `/` is valid in all three views.
- Refactor sidebar item grouping and tour wording to match the new labels.
- Keep the existing admin reporting dashboard intact beneath the new starting guidance.
- Record the role-based navigation structure in `AGENTS.md`.

## Out of scope
- No changes to review calculations, access rules, stored data, or approval logic.
- No new notifications or workflow states; this reorganizes and clarifies what already exists.
