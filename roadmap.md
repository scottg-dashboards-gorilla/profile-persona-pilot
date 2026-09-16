# Roadmap

- [x] Fix error-level RLS findings: company_kpis, manager_notes, goal_key_results, review_cycles, employees, role_configs (fixed; role-scoped read policies + stale findings marked)
- [ ] Per-person draft saving for /assessment (done: drafts keyed by candidate name, resume list on intro screen)
- [ ] Standalone candidate assessment in a SEPARATE project — blocked on user remixing/creating the new project. Spec: HR director enters candidate name + function, generates a unique link per candidate; fixed question set (user will specify); candidate results kept fully separate from employee data.
- [x] Pay pushback trail: employee raises a pay concern on their review, manager logs "I'll speak to HR" with detail, HR closes with outcome (raise_pay_concern RPC + pay_pushback_* fields)
- [x] Hard guard: an outcome cannot be shared with the employee until a proposed pay change is approved (enforce_comp_approved_before_release_trg)
- [ ] Point 2 (reminder emails): share email-domain setup with Scott — he must complete the setup form for mydatapath.com (sender HR@mydatapath.com). Only the domain connection remains; queueing, daily cron, and the send edge function are done.
- [x] Housekeeping: demo employees, their reviews and the 6 stale queued reminders removed. Team list is 66 real people.
