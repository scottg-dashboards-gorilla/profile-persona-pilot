INSERT INTO public.department_questions (department, prompt, help_text, response_type, audience, is_active, sort_order) VALUES
-- AI and Automation (existing sort_order 10)
('AI and Automation', 'Automation uptime and reliability after handover', 'Reword to fit your team — what good looks like: builds keep working in production after the builder moves on.', 'score', 'both', false, 101),
('AI and Automation', 'Documentation of builds and runbooks', 'Reword to fit your team — what good looks like: any teammate could run or fix the automation from the docs alone.', 'score', 'both', false, 102),
('AI and Automation', 'Client feedback on delivered automations', 'Reword to fit your team — what good looks like: clients confirm the automation saved them the time it promised.', 'score', 'both', false, 103),
-- East Coast Sales (existing sort_order 11)
('East Coast Sales', 'Responsiveness to inbound leads', 'Reword to fit your team — what good looks like: every inbound lead gets a first reply within one business day.', 'score', 'both', false, 111),
('East Coast Sales', 'Forecast accuracy for own pipeline', 'Reword to fit your team — what good looks like: committed deals land within the expected month and amount.', 'score', 'both', false, 112),
('East Coast Sales', 'Collaboration with delivery on handoffs', 'Reword to fit your team — what good looks like: signed deals are handed to delivery with complete, accurate scope notes.', 'score', 'both', false, 113),
-- Engineering & Security (existing sort_order 12)
('Engineering & Security', 'Code review quality and timeliness', 'Reword to fit your team — what good looks like: reviews are thorough but returned within one working day.', 'score', 'both', false, 121),
('Engineering & Security', 'Incident response and follow-through', 'Reword to fit your team — what good looks like: responds to pages promptly, writes the postmortem, closes the follow-ups.', 'score', 'both', false, 122),
('Engineering & Security', 'Technical documentation and knowledge sharing', 'Reword to fit your team — what good looks like: designs and decisions are written down where the team can find them.', 'score', 'both', false, 123),
-- Executive Leadership (existing sort_order 13)
('Executive Leadership', 'Quality of decisions and follow-through', 'Reword to fit your team — what good looks like: decisions are made on time with the data available and seen through.', 'score', 'both', false, 131),
('Executive Leadership', 'Cross-department communication', 'Reword to fit your team — what good looks like: other departments hear about changes from you, not from rumours.', 'score', 'both', false, 132),
('Executive Leadership', 'Growth and development of direct reports', 'Reword to fit your team — what good looks like: each direct report has clear goals and a development path.', 'score', 'both', false, 133),
-- Finance (existing sort_order 14)
('Finance', 'Budget variance monitoring and alerts', 'Reword to fit your team — what good looks like: overruns are flagged to owners before month-end, not after.', 'score', 'both', false, 141),
('Finance', 'Process improvement contributions', 'Reword to fit your team — what good looks like: manual steps are automated or simplified each quarter.', 'score', 'both', false, 142),
('Finance', 'Responsiveness to stakeholder requests', 'Reword to fit your team — what good looks like: requests for numbers or approvals answered within one business day.', 'score', 'both', false, 143),
-- Human Resources (existing sort_order 15)
('Human Resources', 'Recruitment pipeline follow-through', 'Reword to fit your team — what good looks like: candidates move through each stage on schedule with no silent gaps.', 'score', 'both', false, 151),
('Human Resources', 'Onboarding quality for new joiners', 'Reword to fit your team — what good looks like: new joiners are productive and equipped by the end of week one.', 'score', 'both', false, 152),
('Human Resources', 'Record accuracy and confidentiality', 'Reword to fit your team — what good looks like: employee records are complete, current, and never over-shared.', 'score', 'both', false, 153),
-- Procurement (existing sort_order 16)
('Procurement', 'Supplier cost savings and negotiation', 'Reword to fit your team — what good looks like: renewals are renegotiated before expiry, not auto-renewed.', 'score', 'both', false, 161),
('Procurement', 'Contract and compliance accuracy', 'Reword to fit your team — what good looks like: contracts, POs and approvals are complete before work starts.', 'score', 'both', false, 162),
('Procurement', 'Service to internal stakeholders', 'Reword to fit your team — what good looks like: purchase requests are acknowledged and resolved on a predictable timeline.', 'score', 'both', false, 163),
-- Sales & Marketing (existing sort_order 17)
('Sales & Marketing', 'Content quality and brand consistency', 'Reword to fit your team — what good looks like: everything published is on-message, accurate and proofread.', 'score', 'both', false, 171),
('Sales & Marketing', 'Lead-to-meeting conversion', 'Reword to fit your team — what good looks like: campaigns produce meetings, not just clicks.', 'score', 'both', false, 172),
('Sales & Marketing', 'Handover quality to sales', 'Reword to fit your team — what good looks like: leads passed to sales come with context the rep can use immediately.', 'score', 'both', false, 173),
-- Service Delivery (existing sort_order 18)
('Service Delivery', 'First-contact resolution rate', 'Reword to fit your team — what good looks like: issues are fixed on the first touch wherever possible.', 'score', 'both', false, 181),
('Service Delivery', 'Customer satisfaction feedback', 'Reword to fit your team — what good looks like: post-ticket survey scores meet or beat the team target.', 'score', 'both', false, 182),
('Service Delivery', 'Knowledge base contributions', 'Reword to fit your team — what good looks like: recurring fixes get documented so the next engineer is faster.', 'score', 'both', false, 183),
-- West Coast Sales (existing sort_order 19)
('West Coast Sales', 'Responsiveness to inbound leads', 'Reword to fit your team — what good looks like: every inbound lead gets a first reply within one business day.', 'score', 'both', false, 191),
('West Coast Sales', 'Forecast accuracy for own pipeline', 'Reword to fit your team — what good looks like: committed deals land within the expected month and amount.', 'score', 'both', false, 192),
('West Coast Sales', 'Collaboration with delivery on handoffs', 'Reword to fit your team — what good looks like: signed deals are handed to delivery with complete, accurate scope notes.', 'score', 'both', false, 193);