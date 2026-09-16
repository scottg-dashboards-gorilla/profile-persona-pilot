# Roadmap

- [x] Fix error-level RLS findings: company_kpis, manager_notes, goal_key_results, review_cycles, employees, role_configs (fixed; role-scoped read policies + stale findings marked)
- [ ] Per-person draft saving for /assessment (done: drafts keyed by candidate name, resume list on intro screen)
- [ ] Standalone candidate assessment in a SEPARATE project — blocked on user remixing/creating the new project. Spec: HR director enters candidate name + function, generates a unique link per candidate; fixed question set (user will specify); candidate results kept fully separate from employee data.
- [x] Pay pushback trail: employee raises a pay concern on their review, manager logs "I'll speak to HR" with detail, HR closes with outcome (raise_pay_concern RPC + pay_pushback_* fields)
- [x] Hard guard: an outcome cannot be shared with the employee until a proposed pay change is approved (enforce_comp_approved_before_release_trg)
- [x] Point 3 (reopen after sharing): saving a completed review that was already shared now requires a written reason, pulls the outcome back from the employee, clears their acknowledgement, and resets HR pay approval (reopened_at/reopened_reason columns + CompleteReviewDialog/flow dialog/timeline updates)
- [x] Point 4 (pay review close): APR flow simplified to manager entry -> HR approval -> shared with the employee. The separate COO/Finance + one-click payroll stage is gone; HR approval stamps the pay approval and releases the outcome to the employee in one guarded step.
- [x] HR pay-changes export: "Export pay changes" on the Annual Pay Review downloads a spreadsheet per year (rating, merit, differentiated award, new pay, increase %, bonus, shares, effective date, HR approval, shared/confirmed status).
- [ ] Audit point 5: no named reviewer on reviews — 4 people have no manager, so their reviews are invisible to everyone but HR.

- [ ] Audit points 7–13: development reviews unlinked, empty goals, orphan reviews (no cycle), escalation send-back detail, pay-concern DB enforcement, rating-distribution check before pay close, funding-curve access.
- [ ] Point 2 (reminder emails): share email-domain setup with Scott — he must complete the setup form for mydatapath.com (sender HR@mydatapath.com). Only the domain connection remains; queueing, daily cron, and the send edge function are done.
- [x] Housekeeping: demo employees, their reviews and the 6 stale queued reminders removed. Team list is 66 real people.
- [x] Audit point 6: employees self-link on sign-in via claim_employee_link() (email match) + auto manager role for people with direct reports; Access & Roles shows linked/not-signed-in/no-email counts.
- [x] Audit point 7: development reviews auto-link to the matching pay review (same person + year, both directions) with C2 score cross-check shown in the PDR dialog.
