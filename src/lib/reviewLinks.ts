import { supabase } from "@/integrations/supabase/client";

export type TokenKind = "self" | "contributor";

/** Public URL a person can open without an account. */
export function formUrl(token: string) {
  return `${window.location.origin}/review-form/${token}`;
}

/**
 * Mints (or reuses) a private form link for a review.
 * `self` -> employee self-assessment + goal check-in.
 * `contributor` -> 360 feedback form for one contributor.
 */
export async function createReviewToken(
  reviewId: string,
  kind: TokenKind,
  contributorId?: string | null,
  days = 60,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_review_token", {
    _review_id: reviewId,
    _kind: kind,
    _contributor_id: contributorId ?? null,
    _days: days,
  });
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function assessmentUrl(reviewId: string, employeeUuid: string) {
  return `${window.location.origin}/assessment?review=${reviewId}&employee=${employeeUuid}`;
}
