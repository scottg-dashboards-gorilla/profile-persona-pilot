# Project architecture rules

- The `/` route is a role-aware Home for employee, manager, and admin views because every user needs a clear starting point.
- Navigation is grouped by the work each view performs; preserve existing permission and row-scoping rules when changing labels or order.
- Keep tasks, annual objectives, review feedback, assessment improvement actions, and pay review as distinct workflows because they have different owners and timing.
- Home cycle stages link to their existing workflow pages and show dates/current focus because the Home page is the orientation layer, not a duplicate workflow.
- The shared Review Cycle page reads the active stored cycle and role-scoped records, then deep-links to existing task screens rather than duplicating their forms.
- Department questions use stored exact job-title scopes and a shared matcher in annual review and off-cycle forms so leaders and technicians receive the correct set without changing access permissions.
- Department assessment profiles use stored role configurations selected from the signed-in employee's department and title; candidate role selection stays independent.
- Department-head goals are reference standards in objective setting, not automatically assigned goals or recorded achievements, to preserve authentic employee review evidence.
- Read review outcomes and value/question ratings through server-masked visible views; base-table reads expose only nonsensitive columns so draft confidentiality cannot be bypassed in the browser.
- Enforce review completeness and rating recalculation in database triggers as well as UI checks so every workflow shares the same safeguards.
- Staff access uses HR/admin-checked functions for account activity and email updates; actual auth sign-in timestamps, not employee links, determine sign-in status, and linked account email changes remain an IT responsibility.
- The manager who approves a review cannot also give its HR pay approval, and flagged assessment areas must have dated actions before completion; both are enforced in database triggers so no screen can bypass them.
