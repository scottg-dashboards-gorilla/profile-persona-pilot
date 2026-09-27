# Project architecture rules

- The `/` route is a role-aware Home for employee, manager, and admin views because every user needs a clear starting point.
- Navigation is grouped by the work each view performs; preserve existing permission and row-scoping rules when changing labels or order.
- Keep tasks, annual objectives, review feedback, assessment improvement actions, and pay review as distinct workflows because they have different owners and timing.