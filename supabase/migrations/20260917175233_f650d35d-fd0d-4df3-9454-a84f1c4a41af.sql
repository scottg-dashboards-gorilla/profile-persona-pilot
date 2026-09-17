DELETE FROM public.review_cycles WHERE id = 'ced4a9bb-8364-4c09-b9a0-42b341eefa68';

UPDATE public.review_cycles
SET name = '2026 Annual Cycle',
    description = 'Annual review cycle for 2026 — covers every employee''s anniversary-based review for the year.',
    starts_at = DATE '2026-01-01',
    ends_at = DATE '2026-12-31',
    status = 'active',
    updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';